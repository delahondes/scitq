
function worker_concurrency_change(worker_id, change) {
    //socket.emit('concurrency_change', {object: 'worker', id: worker_id, change:change})
    $.ajax({url: '/ui/concurrency_change', data: {object: 'worker', id: worker_id, change:change} });
}
function worker_prefetch_change(worker_id, change) {
    //socket.emit('prefetch_change', {object: 'worker', id: worker_id, change:change})
    $.ajax({url: '/ui/prefetch_change', data: {object: 'worker', id: worker_id, change:change} });
}
function add_worker(concurrency, prefetch, flavor, region, provider, batch, number) {
    console.log('Launching new workers: concurrency:',concurrency,
        'flavor:',flavor, 'region:',region, 'provider:',provider, 'batch:',batch, 'number:',number);
    //socket.emit('create_worker', {concurrency: concurrency, prefetch: prefetch, 
    //    flavor: flavor, region: region, batch:batch, number: number});
    $.ajax({url: '/ui/create_worker', data:{concurrency: concurrency, prefetch: prefetch, 
        flavor: flavor, region: region, provider: provider, batch:batch, number: number} });
}


async function get_workers() {
    console.log('Fetching workers...');
    await $.getJSON('/ui/get/', {
                object: 'workers'
            }, async function(data) {

        workers = data.workers;
        totals = data.totals;
        console.log('Received workers ',workers);
        console.log('Received totals ',totals);

        document.getElementById("pending-tasks").innerHTML = `Pending: ${totals.pending}`;
        document.getElementById("assigned-tasks").innerHTML = `Assigned: ${totals.assigned}`;
        document.getElementById("running-tasks").innerHTML = `Running: ${totals.running}`;
        document.getElementById("failed-tasks").innerHTML = `Failed: ${totals.failed}`;
        document.getElementById("succeeded-tasks").innerHTML = `Succeeded: ${totals.succeeded}`;

        
        
        worker_table = '';
        for (i=0; i<workers.length; i++) {
            switch(workers[i].status){
                case 'failed':
                    var worker_status = 'danger';
                    break;
                case 'paused':
                    var worker_status = 'warning';
                    break;
                case 'offline':
                    var worker_status = 'secondary';
                    break;
                case 'running':
                    var worker_status = 'primary';
                    break;
                }    

            worker_table += '<tr class="" ><td><a type="button" class="btn btn-outline-dark border-0" target="_blank" href="/ui/task/?sortby=&worker='+workers[i].worker_id+'&batch="">'+workers[i].name
                    +'</a></td><td class="" id="batch-name-'+workers[i].worker_id+'" style="padding:0"><a target="_blank" href="/ui/task/?sortby=&worker=&batch='+(workers[i].batch==null?'':workers[i].batch).replace(' ','+')+'" type="button" class="btn btn-outline-dark border-0">'+(workers[i].batch==null?'':workers[i].batch)+'</a><button type="button" onclick="ChangeBatch(\''+workers[i].worker_id+'\','+i+'); pause()" class="btn btn-sm" style="margin-top:0.5em;">'
                    +svg_edit+'</button>'
                    +'</td><td class="text-center text-'+worker_status+'" title ="'+workers[i].status+'"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"class="bi bi-circle-fill " viewBox="0 0 16 16"><circle cx="8" cy="8" r="8"/></svg>'
                    +'</td><td>'+workers[i].concurrency
                        +'<div class ="btn-group"><button class="btn btn-outline-dark btn-sm" onClick="worker_concurrency_change('
                        +workers[i].worker_id
                        +',1)">+</button><button class="btn btn-outline-dark btn-sm" onClick="worker_concurrency_change('
                        +workers[i].worker_id
                        +',-1)"">-</button></div>'
                    +'</td><td>'+workers[i].prefetch
                        +'<div class ="btn-group"><button class="btn btn-outline-dark btn-sm" onClick="worker_prefetch_change('
                        +workers[i].worker_id
                        +',1)">+</button><button class="btn btn-outline-dark btn-sm" onClick="worker_prefetch_change('
                        +workers[i].worker_id
                        +',-1)"">-</button></div>'
                    +'</td><td><a type="button" class="btn btn-outline-dark border-0" target="_blank" href="/ui/task/?sortby=&worker='+workers[i].worker_id+'&batch=&show=accepted">'+workers[i].accepted
                    +'</a></td><td><a type="button" class="btn btn-outline-dark border-0" target="_blank" href="/ui/task/?sortby=&worker='+workers[i].worker_id+'&batch=&show=running">'+workers[i].running
                    +'</a></td><td><a type="button" class="btn btn-outline-dark border-0" target="_blank" href="/ui/task/?sortby=&worker='+workers[i].worker_id+'&batch=&show=succeeded">'+workers[i].succeeded
                    +'</a></td><td><a type="button" class="btn btn-outline-dark border-0" target="_blank" href="/ui/task/?sortby=&worker='+workers[i].worker_id+'&batch=&show=failed">'+workers[i].failed
                    +'</a></td><td>'+(workers[i].load==null?'':workers[i].load)
                    +'</td><td>'+(workers[i].memory==null?'':workers[i].memory)+'</td>'
                    +(workers[i].stats!=undefined && typeof(workers[i].stats)=='object'?('<td>'+(workers[i].stats.load)
                        +'</td><td><table><tr><td style="white-space: nowrap;">'+(workers[i].stats.disk.usage.join('</td></tr><tr><td>').replaceAll(':','</td><td width="99">'))
                        +'</td></tr></table></td><td>'+(workers[i].stats.disk.speed+'<br/>'+workers[i].stats.disk.counter)
                        +'</td><td>'+(workers[i].stats.network.speed+'<br/>'+workers[i].stats.network.counter)):'<td>-</td><td>-</td><td>-</td><td>-</td>')
                    +'<td><button type="button" title="delete" onclick="DeleteWorker('+workers[i].worker_id+')" class="btn btn-outline-dark btn-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3-fill" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg></button>'
                    +'</td></tr>\n';
        }


        document.getElementById("worker-table-body").innerHTML = worker_table;
        await get_jobs();
    });
};

//send an order to server to delete in db the worker
function DeleteWorker(worker_id){
    //socket.emit('delete_worker',{worker_id:worker_id});
    $.ajax({url: '/ui/delete_worker', data: {worker_id:worker_id} });
    console.log(('Deleting worker'));
}

//send an order to server to delete the job job_id
function DeleteJob(job_id){
    $.ajax({url: '/ui/delete_job', data: {job_id:job_id} })
    console.log(('Deleting job'));
}

//send an order to server to delete all jobs (succeeded then failed then pending)
function DeleteJobs(){
    $.ajax({url: '/ui/delete_jobs' })
    console.log(('Deleting jobs'));
}

//send an order to server to restart the job job_id
function RestartJob(job_id){
    $.ajax({url: '/ui/restart_job', data: {job_id:job_id} })
    console.log(('Restarting job'));
}



//Function that open a text area in order to modify the batch and send the modification when the key "enter" triggers
function ChangeBatch(id_worker,i){
    document.getElementById('batch-name-'+id_worker).innerHTML=`<input class="col-9" id=batch-name-input-${id_worker} 
                                value="${workers[i].batch==null?'':workers[i].batch}" autofocus>
                            <a type="button" class="btn btn-outline-dark border-0" 
                                style="--bs-btn-padding-y: .10rem; --bs-btn-padding-x: .3rem; --bs-btn-font-size: .75rem;" 
                                onclick="HideChangeBatch('${id_worker}',${i})">X</a>`;
    document.getElementById('batch-name-input-'+id_worker).addEventListener("keypress",function(event){
        if (event.key==='Enter'){
            event.preventDefault();
            //socket.emit('change_batch',{batch_name : document.getElementById('batch-name-input-'+id_worker).value,worker_id:id_worker});
            $.ajax({url: '/ui/change_batch', 
                data: {batch_name : document.getElementById('batch-name-input-'+id_worker).value,worker_id:id_worker} });
            document.getElementById('batch-name-'+id_worker).innerHTML='<a type="button" class="btn btn-outline-dark border-0">Loading..</a>';
            //pause=false;
            unpause();
        }
    })
}
function HideChangeBatch(id_worker,i){
    document.getElementById('batch-name-'+id_worker).innerHTML=`<a type="button" class="btn btn-outline-dark border-0">
            ${workers[i].batch==null?'':workers[i].batch}</a>
            <button type="button" onclick="pause(); ChangeBatch('${id_worker}',${i})" 
            class="btn btn-sm">
            ${svg_edit}
            </button>`;
    //pause=false;
    unpause();
}

//socket.on('jobs', function(data) {
async function get_jobs() {
    await $.getJSON('/ui/jobs', {}, function(data) {
        //while(pause){
        //    await sleep(5000);
        //}    
        console.log('jobs received', data);
        var action_pretify = {
            worker_create: "Create worker",
            worker_deploy: "Deploy worker",
            worker_destroy: "Destroy worker"
        } ;
        var table='';
        var status_name = {
            succeeded: "success",
            pending: "secondary",
            running: "warning",
            failed: "danger"
        } ;
        var status_action = {
            succeeded: 1,
            pending: 0,
            running: 0,
            failed: 1
        } ;
        if (data.jobs.length>0) {
            table = '<table class="table table-responsive text-center table-hover table-striped">\n' +
                '<thead class=" table-secondary"><tr><th>Job</th> <th>Target</th> <th>Status</th> <th style="width: 40em;">Details</th> <th>Action  <button type="button" title="delete"' +
                ' onclick="DeleteJobs()" class="btn btn-outline-dark btn-sm">' + 
                svg_trash + '</button> </th> </tr> </thead>\n'+
                '<tbody>\n';
            data.jobs.forEach(function(job){

                var action = '';
                if (['succeeded','failed','pending'].includes(job.status)) {
                    action = '<button type="button" title="delete" onclick="DeleteJob('+
                            job.job_id+
                            ')" class="btn btn-outline-dark btn-sm">' + svg_trash
                            +'</button>';
                }

                if (job.status=='failed') {
                    action += `<button type="button" title="delete" onclick="RestartJob(${job.job_id})"
                        class="btn btn-outline-dark btn-sm">${svg_restart}</button>`
                }

                if (job.log.length>60) {
                    truncated_part = '<span class="truncated" id="job'+job.job_id+'">'+job.log.substr(60,job.log.length)+'</span>';
                }
                else {
                    truncated_part = '';
                }

                table += '<tr>' 
                    +'<td>'+action_pretify[job.action]+'</td>'
                    +'<td>'+job.target+'</td>'
                    +'<td class="text-center text-'+status_name[job.status]+'" title ="'+job.status
                    +'"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"class="bi bi-circle-fill " viewBox="0 0 16 16"><circle cx="8" cy="8" r="8"/></svg></td>'
                    +'<td style="text-align: left;">'+job.log.substr(0,60) + truncated_part + '</td>'
                    +'<td>'+action+'</td>'
                    +'</tr>\n';
            });
            table += '</tbody></table>\n';
        }
        document.getElementById('jobs').innerHTML = table;
        my_collapse(); 
    });
}

var uncollapsed_elements = [];

function my_collapse() {
$('.truncated').hide() // Hide the text initially
.after('<a title="expand text" href="#">[...]</a>') // Create toggle button
.next().on('click', function (event) { // Attach behavior
    // manage memory
    var element_id=$(this).parent().children(0).attr("id");
    $(this).text() == '[...]' 
      ? uncollapsed_elements.push(element_id)
      : uncollapsed_elements = uncollapsed_elements.filter(item => item !== element_id);

    // prepare the button
    event.preventDefault();
    $(this).text() == '[^]' // Swap the html
      ? $(this).text('[...]').attr("title", "expand text")
      : $(this).text('[^]').attr("title", "collapse text");
    $(this).prev().toggle(); // Hide/show the text

});
// use memory to reset states
uncollapsed_elements.forEach(
 function(element_id) {
    $('#'+element_id).show();
    $('#'+element_id).next().text("[^]");
 }

);
}

//$( document ).ready( get_workers() );
$(document).ready( loop_if_online(get_workers,5000) );