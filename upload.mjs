import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync as ex } from 'node:child_process';

const OWNER='wzaj110-gmail', REPO='wzaj110-gmail.github.io';
const token=ex(`${process.execPath.includes('node')?'':'/opt/homebrew/bin/'}gh auth token`,{shell:'/bin/zsh'}).toString().trim();
const api=async (path,opts={})=>{
  const r=await fetch(`https://api.github.com${path}`,{...opts,headers:{Authorization:`Bearer ${token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'laodie-deploy',...(opts.headers||{})}});
  const txt=await r.text();
  if(!r.ok) throw new Error(`${r.status} ${path} ${txt.slice(0,300)}`);
  return txt?JSON.parse(txt):null;
};
const gh=(bin)=>bin;
void gh;

const files=execSync('find . -type f -not -path "./.git/*"',{cwd:'/tmp/laodie-site'}).toString().trim().split('\n');
console.log('文件数:',files.length);

// blobs
const tree=[];
for(const f of files){
  const p=f.slice(2);
  const content=readFileSync('/tmp/laodie-site/'+p).toString('base64');
  const blob=await api(`/repos/${OWNER}/${REPO}/git/blobs`,{method:'POST',body:JSON.stringify({content,encoding:'base64'})});
  tree.push({path:p,mode:'100644',type:'blob',sha:blob.sha});
}
console.log('blobs 完成');

// existing ref?
let parent=null;
try{ const ref=await api(`/repos/${OWNER}/${REPO}/git/ref/heads/main`); parent=ref.object.sha; }catch(e){ console.log('空仓库，无父提交'); }

const treeObj=await api(`/repos/${OWNER}/${REPO}/git/trees`,{method:'POST',body:JSON.stringify(parent?{base_tree:null,tree}:{tree})});
const commit=await api(`/repos/${OWNER}/${REPO}/git/commits`,{method:'POST',body:JSON.stringify({message:'老爹世界网站：816站门户+古诗/英语/单词/读书',tree:treeObj.sha,...(parent?{parents:[parent]}:{})})});
if(parent){
  await api(`/repos/${OWNER}/${REPO}/git/refs/heads/main`,{method:'PATCH',body:JSON.stringify({sha:commit.sha})});
}else{
  await api(`/repos/${OWNER}/${REPO}/git/refs`,{method:'POST',body:JSON.stringify({ref:'refs/heads/main',sha:commit.sha})});
}
console.log('推送完成 commit:',commit.sha.slice(0,8));
