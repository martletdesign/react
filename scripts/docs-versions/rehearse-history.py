import os,pathlib,tempfile,json,subprocess,hashlib,sys,shutil,atexit
src=pathlib.Path(__file__).resolve().parent.parent.parent; package=json.loads((src/'package.json').read_text()); f=package['name'].split('/')[0][1:]; current=package['version']; parts=current.split('.'); assert len(parts)==3 and all(x.isdigit() for x in parts); next_version=f'{parts[0]}.{parts[1]}.{int(parts[2])+1}'
base=pathlib.Path(tempfile.mkdtemp(prefix='nightjar-react-docs-next-'));atexit.register(shutil.rmtree,base,ignore_errors=True); repo=base/'repo';repo.mkdir();archives=base/'archives';archives.mkdir()
def run(args,cwd=repo,env=None):
 p=subprocess.run(args,cwd=cwd,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if p.returncode:print('FAILED',args,p.stdout[-1000:],p.stderr[-1000:]);raise SystemExit(p.returncode)
 return p.stdout.strip()
env=os.environ.copy();env.setdefault('NODE_USE_ENV_PROXY','1');prefix=env.get('DOCS_DEPLOY_PREFIX','/preview');assert prefix in ('','/preview');empty=base/'empty.json';empty.write_text(json.dumps({'schemaVersion':1,'family':f,'framework':'react','latestStable':None,'versions':[]})+'\n');env.update({'DOCS_ARCHIVE_ROOT':str(archives),'DOCS_BASELINE_PATH':str(empty),'DOCS_BASELINE_SHA256':hashlib.sha256(empty.read_bytes()).hexdigest(),'DOCS_DEPLOY_PREFIX':prefix,'RELEASE_TAG':'v'+current});run(['node','scripts/docs-versions/build-release.mjs'],cwd=src,env=env)
data=subprocess.run(['git','archive','HEAD'],cwd=src,stdout=subprocess.PIPE,check=True);subprocess.run(['tar','-x','-C',str(repo)],input=data.stdout,check=True)
for name in ['package.json','package-lock.json']:
 p=repo/name;d=json.loads(p.read_text());d['version']=next_version
 if name=='package-lock.json':d['packages']['']['version']=next_version
 p.write_text(json.dumps(d,indent=2)+'\n')
run(['git','init','-b','main']);run(['git','config','user.email','rehearsal@example.invalid']);run(['git','config','user.name','Rehearsal']);run(['git','add','-A']);run(['git','commit','-m','local future version']);
env['GITHUB_SHA']=run(['git','rev-parse','HEAD']);# Each archive build installs its own locked dependencies.
m=(archives/current/'manifest.json').read_bytes();obj=json.loads(m);before=hashlib.sha256(m).hexdigest();oldfiles={str(p.relative_to(archives/current)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (archives/current).rglob('*') if p.is_file()};entry={'version':current,'channel':'stable','manifestSha256':before,'supported':True,'topics':[x['path'] for x in obj['files'] if x['path'].endswith('.html')]};assert entry['topics'] and all(f'href="{prefix}/docs/versions/"' in (archives/current/path).read_text() for path in entry['topics']);catalog={'schemaVersion':1,'family':f,'framework':'react','latestStable':current,'versions':[entry]};baseline=base/'baseline.json';baseline.write_text(json.dumps(catalog)+'\n');env.update({'DOCS_ARCHIVE_ROOT':str(archives),'DOCS_BASELINE_PATH':str(baseline),'DOCS_BASELINE_SHA256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'DOCS_DEPLOY_PREFIX':prefix,'RELEASE_TAG':'v'+next_version});run(['node','scripts/docs-versions/build-release.mjs'],env=env)
assert hashlib.sha256((archives/current/'manifest.json').read_bytes()).hexdigest()==before
assert oldfiles=={str(p.relative_to(archives/current)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (archives/current).rglob('*') if p.is_file()}
assert (archives/next_version/'manifest.json').is_file()
print(json.dumps({'family':f,'base':prefix or '/', 'previous_snapshot':'verified and unchanged','no_javascript_index':'present on every old HTML page','new_framework_version':next_version,'core_version':json.loads((archives/next_version/'manifest.json').read_text())['core']['version'],'latest_promoted':False,'production_mutations':False}))
