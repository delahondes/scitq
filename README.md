# scitq : a distributed scientific task queue

Item|Project site
--|--
Source|[https://github.com/gmtsciencedev/scitq](https://github.com/gmtsciencedev/scitq)
Documentation|[https://scitq.readthedocs.io/](https://scitq.readthedocs.io/)
Download|[https://pypi.org/project/scitq/](https://pypi.org/project/scitq/)
Docker images|[worker](https://hub.docker.com/repository/docker/gmtscience/scitq-worker) and [server](https://hub.docker.com/repository/docker/gmtscience/scitq-server)
Examples|[https://github.com/gmtsciencedev/scitq-examples](https://github.com/gmtsciencedev/scitq-examples)
Keywords|task, queue, job, python, distributed, science


**scitq** is a distributed task queue in python. While quite generalist, it was primarily designed for scientific jobs, relatively heavy tasks that can be expressed as a Unix shell instruction. It has also a specificity of relatively feebly interdependent tasks.

It has a few added capabilities apart from strict task distribution:

- First it has the capacity to manage cloud instance life cycle (as for now 
OpenStack (OVH), Microsoft Azure, and others to follow) - Note that you can still use 
scitq without using that functionality, and you may use it in a mixed environment
(with one or several static server plus extra temporary servers recruited on the
cloud). 
- next, scitq has the capacity to download and upload specific data - notably 
using s3 buckets, or Azure containers as data exchange medium, but simple ftp is also possible,
and even some more exotic stuff like IBM Aspera, last a very specific protocol for 
bioinformatics dedicated to downloading public FASTQs (DNA sequence) from EBI or
 NCBI,
- it integrates nicely with docker, providing support for private registries, and wrapping docker executions in a simple yet efficient way,
It provides a simple data slot paradigm for docker: data input slots or data output slots 
are always in the same place (/input or /output) (in non-dockerized environment,
shell environment variable INPUT and OUTPUT hold the dedicated directories for
these, so docker remains non-mandatory in scitq).

## What it does, and what it does not

**scitq** is a practical tool; it is meant as a cloud solution to dispatch a serie of tasks and monitor them. It tries to do just this job in a convenient way, not getting in the middle. In a lot of concurrent tools, once a serie of tasks is launched, there is very little you can do: this is where scitq is at its best: 

- you can pause all the tasks to fix something amiss,
- you can change the command executed for the future tasks whithout relaunching the whole serie,
- you can resume and relauch very easily any failed task with or without changing the command (with UI or command line tools, no code needed),
- you can watch (almost - 5s) live the output of any individual task(s) using UI or command line,
- you can adjust execution parameters (like concurrency or prefetch),
- you can add or remove working nodes during execution,
- scitq code can be patched while a task serie is running (client and/or server code),
- it is resilient to network troubles,
- loss of a node or temporary server loss (24 hours) should have very limited impact,
- you can mix different cloud resources in the same serie (using S3, OVH, and Azure together if that is what you want).

It provides convenient utilities such as scitq-fetch which can replace specialised tools like AWS or Azure tool and address the different storages the same way.

It does not provide:

- a workflow solution, as in its usual use case workflows are managed within tasks (notably in bioinformatics, useful programs tends to be provided as packaged workflows - no need to re-implement what is already done),
- an abstract environment: it runs vanilla docker with some mount options (or whatever option you want),
- a custom language to express the orchestration logic, yet it provides a simple python library (`scitq.lib`) which makes orchestration through python an easy task (it can be done with some shell code also)

## Introduction

**scitq** is a Task Queue system based on the following model:

- a server hosts a series of (shell) tasks to be executed,
- some workers connect to the server, fetch some tasks according to their capacity
(which is very simply managed by the maximum number of parallel process they can
handle, a.k.a. "concurrency"),
- The stdout/stderr of the command is regularly (all 5s or so) sent to the
server. A task may be executed several times (for instance if it fails). While
this is not automatic, it is easy to trigger and each execution of the task is
remembered.

### Quick start

Install:
```bash
pip install scitq
```

Now in one shell, run the server:
```bash
FLASK_APP=scitq.server flask run
```

In a another shell, launch the worker:
```bash
scitq-worker 127.0.0.1 1
```

In a third shell, queue some tasks:
```bash
scitq-launch echo 'Hello world!'
```
You're done!

Optionally look on http://127.0.0.1:5000/ui/ to see what happened.

Look into the [documentation](https://scitq.readthedocs.io/) to learn about the different options.


### A more elaborate example

Let's dive in some code that does really something. Let's say you want to run fastp to assess the quality of all public FASTQs of a given publicly available project.


#### a minimal server and some worker(s)

we want to minimize the setup in that example, so we will run the server in debug mode. 

We'll deploy the worker manually, but maybe on another server, not the same as the scitq-server. But you can use the same server if you prefer. You can also deploy several workers. We will refer to those servers that run scitq-worker as "workers".

On the scitq-server server, install scitq:
```bash
pip install scitq
```

We will use an S3 storage. Configure it the usual way with `.aws/credentials` (and `.aws/config` if needed - note that is is needed for non-AWS S3). Configure it on each server (it is not strictly required on the scitq-server server, but it will be convenient to retrieve the data in the end). We will also need to create a bucket, which we will call `mybucket` (or adapt the code replacing mybucket by your real bucket name).

On remote servers, when I run long term tasks, I usually use GNU screen. But then again, you can open several SSH connection if you prefer.

On the scitq-server server, we will need two open shell, one with the server runnning, with this command:
```bash
FLASK_APP=scitq.server flask run
```

And the other to be able to run some code.

On the worker(s), install scitq as well (same as above, with pip), but we will also need docker (which is installed using `apt install docker.io` in Ubuntu), and then run in a shell:

```bash
scitq-worker <IP of scitq server> 1
```

PS remember to install the `.aws` folder that is needed for s3.

A very minimal setup, but enough for what we need to do. In a production setup, you'd want scitq to deploy the workers automatically for you, but that requires ansible install and setup, we'll come to that later.

#### the computation

First we want to get a list of all the runs and samples, and we will use ENA API to do so (remember that the EBI mirror NCBI and so this work for any project except extremely recent projects deposited on NCBI SRA - now you can certainly use sratools if you prefer, but you'll have to adpat the code and install sratools):
```python
import requests
import sys

project=sys.argv[1]

def get_sample_runs(project):
  """Get sample & runs from ENA"""
  query=requests.get(f"https://www.ebi.ac.uk/ena/portal/api/filereport?accession={project}&result=read_run&fields=sample_accession,run_accession&format=json&download=true&limit=0")
  samples = {}
  for item in query.json():
    samples[item['sample_accession']] = samples.get(item['sample_accession'],[]) + [item['run_accession']]
  return samples
```

Next for our task, we need to download the FASTQs, but scitq will take care of that for us, which we will show just after. Next we must pass them to fastp. We need to find a docker image with fastp included. We could of course build our own and use conda to install fastp, but here we are lucky and some nice people from StaPH-B did that for us, the docker image is public and called: staphb/fastp.

We will run this rather classical fastp command (suited for unpaired reads):
```bash
zcat *.f*q.gz |fastp --stdin --out1 $sample.fastq.gz --json $sample-fastp.json --cut_front --cut_tail --n_base_limit 0 --length_required 60 \
  --adapter_sequence AGATCGGAAGAGCACACGTCTGAACTCCAGTCA --adapter_sequence_r2 AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT
```

scitq will take care of collecting the output for us, but we'd like to have fastp json report collected as well, and also get back the cleaned FASTQs. This is where our S3 storage will be useful.

So our next function will create the corresponding scitq task using the Server.task_create method, our code will be run on the scitq server, so we will use 127.0.0.1 as the server IP address - but you can also use the public IP or a public name that point to it:
```python
from scitq.lib import Server

def run_tasks(samples,project):
  s=Server('127.0.0.1')
  tasks = []
  for sample, runs in samples.items():
    task.append(
      s.task_create(
        command = f"sh -c 'zcat /input/*.f*q.gz |fastp --stdin \
          --out1 /output/{sample}.fastq.gz \
          --json /output/{sample}-fastp.json \
          --cut_front --cut_tail --n_base_limit 0 --length_required 60 \
          --adapter_sequence AGATCGGAAGAGCACACGTCTGAACTCCAGTCA \
          --adapter_sequence_r2 AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT' ",
        input = " ".join([f'run+fastq://{run}' for run in runs]),
        output = f"s3://mybucket/myresults/{project}/{sample}/",
        container = "staphb/fastp"
      )
    )

  s.join(tasks, retry=2)
```

Ok, here our s.task_create command is obviously doing lots of things, let's look in detail at each argument:

- `command` : you recognize the shell command that we discussed above. We have wraped it in a shell (using `sh -c '...'`) because scitq tasks do not use shell by default (which is not always present in docker images), but here we use a pipe which is a shell comodity, so we need a shell. Next, we have taken our input files from the `/input/` folder, and we output all we want back in the `/output` folder. Otherwise it is the same command.
- `input` this is were we ask scitq to fetch the public data for us and make it available in the `/input` folder of our docker. It is a string of space separated URI, and here we use a very specialised URI: `run+fastq://<run accession>` that probably only scitq understand. scitq will use whatever works, starting from EBI ftp, then switching to NCBI sratools if it does not work, and trying 10 times (EBI Aspera will also be tempted). As you have noticed we installed nothing for sratools or aspera, but scitq will use the official dockers of those solutions to fetch the data, if it thinks it is needed. (note that `scitq-fetch` is a standalone utility that understand these URIs and can be used outside of scitq, it is included in scitq python package)
- `output` this is where all that is in our docker `/output/` at the end of the task will be copied to. Here you may recognize a completely standard s3 URI, designating a folder in our s3 bucket, we have an independant subfolder for each sample, which is not mandatory in our case as output files have different names for each sample, but is generally advised.
- `container` this is simply the docker image that will be used to run the command.

In the end, the last line, we use a small command to wait for all the tasks to complete, which name is reminiscent of a function in python threading package. It will block python code, waiting that all the task completed, making the queuing script end only when all tasks are done. It takes an optional parameter, retry, which tels scitq to automatically retry failed tasks two times before giving up. It makes a small reporting log during execution also.

And that's it!

So to sum it up, our final code is:

```python
import requests
import sys
from scitq.lib import Server

def get_sample_runs(project):
  """Get sample & runs from ENA"""
  query=requests.get(f"https://www.ebi.ac.uk/ena/portal/api/filereport?accession={project}&result=read_run&fields=sample_accession,run_accession&format=json&download=true&limit=0")
  samples = {}
  for item in query.json():
    samples[item['sample_accession']] = samples.get(item['sample_accession'],[]) + [item['run_accession']]
  return samples

def run_tasks(samples,project):
  s=Server('127.0.0.1')
  tasks = []
  for sample, runs in samples.items():
    tasks.append(
      s.task_create(
        command = f"sh -c 'zcat /input/*.f*q.gz |fastp --stdin \
          --out1 /output/{sample}.fastq.gz \
          --json /output/{sample}-fastp.json \
          --cut_front --cut_tail --n_base_limit 0 --length_required 60 \
          --adapter_sequence AGATCGGAAGAGCACACGTCTGAACTCCAGTCA \
          --adapter_sequence_r2 AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT' ",
        input = " ".join([f'run+fastq://{run}' for run in runs]),
        output = f"s3://mybucket/myresults/{project}/{sample}/",
        container = "staphb/fastp"
      )
    )

  s.join(tasks, retry=2)

if __name__=='__main__':
  project = sys.argv[1]
  samples = get_sample_runs(project)
  run_tasks(samples, project)
```

Now you can run it with a bioproject name on your scitq server (let us say it is uploaded to scitq-fastp.py on our scitq server):

```bash
python scitq-fastp.py PRJEB46098
```
(this project is 69 heavy FASTQ so it takes a little while to compute on low end machines).

Now connect to your scitq server on `http://<public-ip-of-server>:5000/ui/` and watch the tasks being distributed. You may also want to increase the prefetch option in workers to tell scitq to prepare the input of several tasks in advance. You may want to increase the concurrency option if your worker(s) have some spare power (several CPU). You may notice that running tasks seem to exceed the concurrency of the worker at some times. It is because the task uploading their results are reported as running, but as the worker does not really work when it upload results, it still frees a running slot. So in fact, tasks are not really running in excess, do not worry.

Note that killing the python script won't stop the tasks. The script is just a queuing script, the engine that run the tasks is scitq. The simple way to stop it is to use the `scitq-manage` utility, like you would in production (here we run it on the server, hence the 127.0.0.1):

This first command will prevent any new task to be run.
```bash
scitq-manage -s 127.0.0.1 batch stop -n Default
```
(the `-n Default` comes in because we did not specify a batch in our task_create command, so by default, it uses the `Default` batch. batches are just a convenient way of grouping tasks)

This second command will also terminate all running tasks as soon as possible:
```bash
scitq-manage -s 127.0.0.1 batch stop -n Default --term
```

These commands can be reversed by:
```bash
scitq-manage -s 127.0.0.1 batch go -n Default
```

If you want to completely remove any trace of this computation on scitq, just delete the batch:
```bash
scitq-manage -s 127.0.0.1 batch delete -n Default
```

Of course for the purpose of demonstration, do not delete the batch and let a few tasks terminate normally.


#### getting back the results

Ok so now your results are all in `s3://mybucket/myresults/PRJEB46098`. You should get them back on the server and see them.

You can of course use AWS utility:
```bash
aws s3 sync s3://mybucket/myresults/PRJEB46098 ./PRJEB46098
```

But you can also use `scitq-fetch` utility:
```bash
scitq-fetch sync s3://mybucket/myresults/PRJEB46098 ./PRJEB46098
```

Both command will do pretty much the same thing, except AWS native command is more thorough, it will check file integrity with an hash algorithm (very much like MD5), which scitq-fetch won't do, relying only on file name and exact size. However, it uses the AWS library `boto3` under the hood, and is thus safe. Also scitq-fetch comes in with scitq package, you won't need to install anything else, and it is agnostic of the provider, meaning you can also use it on Azure storages, or plain ftp with the same syntax, something AWS native command won't do.

#### getting back the outputs

If you want to get back the output, which you cannot do if you deleted the batch as shown previously, you can list the tasks:

```bash
scitq-manage -s 127.0.0.1 task list
```

And get the output of any task:
```bash
scitq-manage -s 127.0.0.1 task output -i <id of task>
```

You can also group both commands to get a listing of all outputs (the first line enable us to give up the `-s` argument we've used up to now):
```bash
export SCITQ_SERVER=127.0.0.1
scitq-manage task list -S succeeded -H|cut -d' ' -f1|xargs -n 1 scitq-manage task output --output -i
```

In python you would do like that:
```python
from scitq.lib import Server

s=Server('127.0.0.1', style='object')

for task in s.tasks(status='succeeded'):
  print(f'-------------\ncommand:{task.command}\n-------------\noutput:{task.output}\n\n')
```
NB by default the scitq.lib.Server return answers with dictionary objects, translating plainly JSON the usual way in python. However, object notation is nicer in python, so we use the `style='object'` option to pass the dictionaries to argparse.Namespace, which implements the object notation. 

Note that you can also export the task outputs from the task UI (`http://<public-ip-of-server>:5000/ui/task/`) as a json file.

Do not let the debug server run like that as it does not offer any security and some people could remotely launch commands on your workers... In a production server, accesses are restricted to trusted IPs. This is covered in the install.

For even more complete examples, see [https://github.com/gmtsciencedev/scitq-examples](https://github.com/gmtsciencedev/scitq-examples).