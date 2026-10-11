'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Search,X} from 'lucide-react';
import type {Locale} from '@/i18n';
export type Command = {id:string;label:string;detail:string;keywords?:string};
export default function CommandPalette({open,onClose,onChoose,commands,locale}:{open:boolean;onClose:()=>void;onChoose:(id:string)=>void;commands:Command[];locale:Locale}) {
 const dialog=useRef<HTMLDialogElement>(null);const input=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState('');const [active,setActive]=useState(0);const ko=locale==='ko';
 const results=commands.filter(c=>`${c.label} ${c.detail} ${c.keywords||''}`.toLowerCase().includes(query.toLowerCase()));
 useEffect(()=>{
  if(open&&!dialog.current?.open){dialog.current?.showModal();input.current?.focus();}
  if(!open&&dialog.current?.open)dialog.current.close();
 },[open]);
 function choose(id:string){setQuery('');setActive(0);onChoose(id);onClose();}
 return <dialog className="command-dialog" ref={dialog} onClose={onClose} aria-label={ko?'빠른 이동':'Quick navigation'} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <div className="command-search row"><Search size={20}/><input ref={input} aria-label={ko?'기능 검색':'Search workspace'} placeholder={ko?'문의, 학생, 성장 도구 검색…':'Search inquiries, students, growth tools…'} value={query}
   role="combobox" aria-controls="command-results" aria-expanded={open} aria-autocomplete="list" aria-activedescendant={results[active]?`command-${results[active].id}`:undefined}
   onChange={e=>{setQuery(e.target.value);setActive(0);}} onKeyDown={e=>{
    if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>results.length?(i+1)%results.length:0);}
    if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>results.length?(i-1+results.length)%results.length:0);}
    if(e.key==='Enter'&&results[active]){e.preventDefault();choose(results[active].id);}
   }}/><button className="icon-button" aria-label={ko?'검색 닫기':'Close search'} onClick={onClose}><X size={18}/></button></div>
  <div className="command-results" id="command-results" role="listbox" aria-label={ko?'이동할 기능':'Workspace destinations'}>
   {results.map((c,i)=><button id={`command-${c.id}`} key={c.id} role="option" aria-selected={active===i} className={`command-result ${active===i?'selected':''}`} onClick={()=>choose(c.id)}><span><strong>{c.label}</strong><small>{c.detail}</small></span><ArrowUpRight size={18}/></button>)}
   {!results.length&&<div className="empty">{ko?'일치하는 기능이 없습니다.':'No matching workflows.'}</div>}
  </div><div className="command-footer muted small">↑ ↓ {ko?'선택':'Select'} · Enter {ko?'이동':'Open'} · Esc {ko?'닫기':'Close'}</div>
 </dialog>;
}
