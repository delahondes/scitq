import os
from socket import gethostname
from ..util import check_dir, package_path
from logging.config import dictConfig
from ..default_settings import SQLALCHEMY_POOL_SIZE, SQLALCHEMY_DATABASE_URI
from ..constants import DEFAULT_SERVER_CONF


if 'FLASK_APP' not in os.environ and 'SCITQ_PRODUCTION' not in os.environ:
    import dotenv
    dotenv.load_dotenv(DEFAULT_SERVER_CONF, override=False)


MAIN_THREAD_SLEEP = 5
WORKER_OFFLINE_DELAY = 15
SCITQ_SERVER = os.environ.get('SCITQ_SERVER',None)

WORKER_CREATE = f'cd {package_path("ansible","playbooks")} && ansible-playbook deploy_one_vm.yaml --extra-vars \
"nodename={{hostname}} concurrency={{concurrency}} status=running flavor={{flavor}} \
region={{region}} provider={{provider}}"'

if SCITQ_SERVER is not None:
    WORKER_CREATE = WORKER_CREATE[:-1] + f' target={SCITQ_SERVER}"'
    SCITQ_SHORTNAME = SCITQ_SERVER.split('.')[0]
else:
    SCITQ_SHORTNAME = gethostname().split('.')[0]
WORKER_DELETE = os.environ.get('WORKER_DELETE',
    f'cd {package_path("ansible","playbooks")} && ansible-playbook destroy_vm.yaml --extra-vars "nodename={{hostname}}"')
SERVER_CRASH_WORKER_RECOVERY = os.environ.get('SERVER_CRASH_WORKER_RECOVERY',
    f'cd {package_path("ansible","playbooks")} && ansible-playbook check_after_reboot.yaml')
WORKER_IDLE_CALLBACK = os.environ.get('WORKER_IDLE_CALLBACK',WORKER_DELETE)
WORKER_CREATE_CONCURRENCY = 10
WORKER_CREATE_RETRY=2
WORKER_CREATE_RETRY_SLEEP=30
UI_OUTPUT_TRUNC=100
UI_MAX_DISPLAYED_ROW = 500
WORKER_DESTROY_RETRY=2
DEFAULT_BATCH = 'Default'
TERMINATE_TIMEOUT = 20
KILL_TIMEOUT = 30
JOB_MAX_LIFETIME = 600

def _(x):
    """a fail-free shortcut to os.environ.get to import an env variable"""
    return os.environ.get(x,'')

AZURE_REGIONS=_('AZURE_REGIONS')
AZURE_CPUQUOTAS=_('AZURE_CPUQUOTAS')
AZURE_SUBSCRIPTION_ID=_('AZURE_SUBSCRIPTION_ID')
AZURE_CLIENT_ID=_('AZURE_CLIENT_ID')
AZURE_SECRET=_('AZURE_SECRET')
AZURE_TENANT=_('AZURE_TENANT')

OVH_REGIONS=_('OVH_REGIONS')
OVH_CPUQUOTAS=_('OVH_CPUQUOTAS')


def setup_log():
    """Setting up log must occur only in specific contexts"""
    if os.environ.get('QUEUE_PROCESS') and os.environ.get('QUEUE_LOG_FILE'):
        check_dir(os.environ.get('QUEUE_LOG_FILE'))
        dictConfig({
            'version': 1,
            'formatters': {'default': {
                'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
            }},
            'handlers': {'wsgi': {
                'class': 'logging.StreamHandler',
                'stream': 'ext://flask.logging.wsgi_errors_stream',
                'formatter': 'default'
            }, "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "default",
                "filename": os.environ.get('QUEUE_LOG_FILE'),
                "maxBytes": int(os.environ.get('QUEUE_LOG_FILE_MAX_SIZE',
                    os.environ.get('LOG_FILE_MAX_SIZE',"10000000"))),
                "backupCount": int(os.environ.get('QUEUE_LOG_FILE_KEEP',
                    os.environ.get('LOG_FILE_KEEP',"3")))
            }},
            'root': {
                'level': os.environ.get('LOG_LEVEL',"INFO"),
                'handlers': ['wsgi' if 'DEBUG' in os.environ else 'file']
            }
        })
    else:
        check_dir(os.environ.get('LOG_FILE',"/tmp/scitq.log"))
        dictConfig({
            'version': 1,
            'formatters': {'default': {
                'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
            }},
            'handlers': {'wsgi': {
                'class': 'logging.StreamHandler',
                'stream': 'ext://flask.logging.wsgi_errors_stream',
                'formatter': 'default'
            }, "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "default",
                "filename": os.environ.get('LOG_FILE',"/tmp/scitq.log"),
                "maxBytes": int(os.environ.get('LOG_FILE_MAX_SIZE',"10000000")),
                "backupCount": int(os.environ.get('LOG_FILE_KEEP',"3"))
            }},
            'root': {
                'level': os.environ.get('LOG_LEVEL',"INFO"),
                'handlers': ['wsgi' if 'DEBUG' in os.environ else 'file']
            }
        })

IS_SQLITE = 'sqlite' in SQLALCHEMY_DATABASE_URI

