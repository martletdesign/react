import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {Button} from 'catalog-family';
import './workspace.css';
const original=[{author:'Mara · Example message',text:'Could we review the conditions note before publishing?'},{author:'Rowan · Example message',text:'Yes. Keep the uncertainty visible in the account.'}];
export function Chat(){
 const id=useId(),input=useRef<HTMLTextAreaElement>(null);
 const [enhanced,setEnhanced]=useState(false),[draft,setDraft]=useState(''),[messages,setMessages]=useState(original),[status,setStatus]=useState('Messages remain in page memory. Nothing is delivered.');
 useEffect(()=>setEnhanced(true),[]);
 const submit=(event:FormEvent)=>{event.preventDefault();const text=draft.trim();if(!text){input.current?.setCustomValidity('Enter a message before adding it.');input.current?.reportValidity();return;}setMessages(old=>[...old,{author:'You · Local preview',text}]);setDraft('');setStatus('Added to this preview. Not sent to anyone; cleared when you leave or reload.');input.current?.focus();};
 const reset=()=>{setMessages(original);setDraft('');input.current?.setCustomValidity('');setStatus('Conversation reset. Nothing was delivered.');};
 return <><ol className="rw-messages" aria-label="Conversation">{messages.map((message,index)=><li key={index}><strong>{message.author}</strong><p>{message.text}</p></li>)}</ol><form onSubmit={submit}><fieldset disabled={!enhanced}><legend>Add a local message</legend><label htmlFor={`chat-${id}`}>Message</label><textarea ref={input} id={`chat-${id}`} value={draft} onChange={event=>{event.currentTarget.setCustomValidity('');setDraft(event.target.value);setStatus('Messages remain in page memory. Nothing is delivered.');}} onInvalid={event=>setStatus(event.currentTarget.validity.valueMissing||event.currentTarget.validity.customError?'Enter a message before adding it.':'Check the message and try again.')} required maxLength={1000} rows={3}/><div className="rw-actions"><Button type="submit">Add to this preview</Button><Button type="button" variant="secondary" onClick={reset}>Reset conversation</Button></div></fieldset><p role="status">{status}</p></form>{!enhanced&&<p data-chat-fallback>Message composition is unavailable.</p>}<noscript><p>Message composition requires JavaScript.</p></noscript></>;
}
