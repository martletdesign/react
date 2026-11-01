import {useEffect,useId,useState} from 'react';
import {exampleImage} from '../assets';
import './simulation.css';

type Viewpoint='coast'|'station'|'notebook';
const views:Record<Viewpoint,{label:string;alt:string}>={
 coast:{label:'Coastline',alt:'Illustrated coastline with observation markers.'},
 station:{label:'Field station',alt:'Stylised field station beside water.'},
 notebook:{label:'Notebook',alt:'An open field notebook with observation lines.'}
};
function useEnhanced(){const [enhanced,setEnhanced]=useState(false);useEffect(()=>setEnhanced(true),[]);return enhanced;}
export function Sensors(){
 const enhanced=useEnhanced(),id=useId(),[temperature,setTemperature]=useState('18'),[ventilation,setVentilation]=useState(false),[changed,setChanged]=useState(false);
 return <div className="simulation" data-sensors><dl><div><dt>Illustrative indoor temperature</dt><dd><output>{temperature} °C</output></dd></div><div><dt>Illustrative battery charge</dt><dd>72%</dd></div><div><dt>Data source</dt><dd>Simulation</dd></div></dl><div className="simulation-controls"><label htmlFor={`${id}-mode`}>Simulated conditions</label><select id={`${id}-mode`} disabled={!enhanced} value={temperature} onChange={event=>{setTemperature(event.target.value);setChanged(true)}}><option value="18">Normal day</option><option value="12">Cool morning</option><option value="24">Warm afternoon</option></select><label><input type="checkbox" disabled={!enhanced} checked={ventilation} onChange={event=>{setVentilation(event.target.checked);setChanged(true)}}/> Preview ventilation enabled</label><p role="status">{changed?`Simulation updated. Preview ventilation ${ventilation?'enabled':'disabled'}. No real device is connected.`:'No real device is connected. Controls affect this preview only.'}</p></div><noscript><p>Changing simulated conditions requires JavaScript.</p></noscript></div>;
}
export function Scene(){
 const enhanced=useEnhanced(),id=useId(),[view,setView]=useState<Viewpoint>('coast'),[changed,setChanged]=useState(false),item=views[view];
 return <div className="simulation" data-scene><div className="simulation-controls"><label htmlFor={`${id}-view`}>Viewpoint</label><select id={`${id}-view`} value={view} disabled={!enhanced} onChange={event=>{const value=event.target.value;if(Object.hasOwn(views,value)){setView(value as Viewpoint);setChanged(true)}}}>{Object.entries(views).map(([key,option])=><option key={key} value={key}>{option.label}</option>)}</select></div><figure><img src={exampleImage(`/assets/examples/${view}.svg`)} alt={item.alt} width="960" height="640"/><figcaption>{changed?`${item.label} · Original fictional illustration.`:'Coastline · Original vector illustration; fictional geography.'}</figcaption></figure><p role="status">{changed?`Showing ${item.label}. No immersive device is connected.`:'Static illustration. No immersive device is connected.'}</p><noscript><p>Changing the illustrated viewpoint requires JavaScript.</p></noscript></div>;
}
