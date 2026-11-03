import {useEffect,useId,useRef,useState,type MouseEvent} from 'react';
import {Button,family} from 'catalog-family';
import {exampleImage} from '../assets';
import './gallery.css';
export type GalleryItem={title:string;image:string;alt:string;caption:string};
export type GallerySection={id:string;title:string;items:GalleryItem[]};
export function Gallery({section}:{section:GallerySection}) {
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLAnchorElement|null>(null),[selected,setSelected]=useState<GalleryItem|null>(null);
 useEffect(()=>{const node=dialog.current;if(!node)return;if(selected&&!node.open)node.showModal();else if(!selected&&node.open)node.close();},[selected]);
 const open=(event:MouseEvent<HTMLAnchorElement>,item:GalleryItem)=>{const node=dialog.current;if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||typeof node?.showModal!=='function'||node.open)return;try{node.showModal();}catch{return;}event.preventDefault();opener.current=event.currentTarget;setSelected(item);};
 const closed=()=>{if(dialog.current?.open)return;setSelected(null);const active=document.activeElement;if(opener.current?.isConnected&&(!active||active===document.body||active===document.documentElement||dialog.current?.contains(active)))opener.current.focus();};
 return <div className="react-gallery" data-gallery={section.id}>
  <div className="rg-grid">{section.items.map((item,index)=><figure key={`${item.image}-${index}`}><a href={exampleImage(item.image)} onClick={event=>open(event,item)}><img src={exampleImage(item.image)} alt={item.alt} width="960" height="640" loading="lazy"/><span>Enlarge {item.title}</span></a><figcaption>{item.caption}</figcaption></figure>)}</div>
  <dialog ref={dialog} className={`${family}-dialog rg-dialog`} aria-labelledby={`gallery-title-${id}`} onClose={closed}><h3 id={`gallery-title-${id}`}>Image detail: {section.title}</h3><Button type="button" onClick={()=>dialog.current?.close()}>Close image</Button>{selected&&<figure><img src={exampleImage(selected.image)} alt={selected.alt} width="960" height="640"/><figcaption>{selected.caption}</figcaption></figure>}</dialog>
 </div>;
}
