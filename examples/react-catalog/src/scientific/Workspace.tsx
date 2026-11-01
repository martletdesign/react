import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {Button,DataTable,Field,TextInput} from 'catalog-family';
import {thermalDefaults,thermalModel,thermalNumber,thermalCsv} from '../../../page-archetypes/jekyll/assets/js/thermal-model.mjs';
import './workspace.css';

type Input = {initial:string;ambient:string;timeConstant:string;duration:string};
const fields: {key:keyof Input;label:string;hint:string}[] = [
 {key:'initial',label:'Initial temperature (°C)',hint:'From −273.15 to 1,000 °C.'},
 {key:'ambient',label:'Ambient temperature (°C)',hint:'From −273.15 to 1,000 °C.'},
 {key:'timeConstant',label:'Time constant (min)',hint:'A positive value from 0.001 to 10,000 minutes.'},
 {key:'duration',label:'Duration (min)',hint:'A value from 0.05 to 10,000 minutes.'}
];
export function ScientificWorkspace(){
 const id=useId(),errorRef=useRef<HTMLDivElement>(null);
 const [enhanced,setEnhanced]=useState(false),[draft,setDraft]=useState<Input>({...thermalDefaults}),[applied,setApplied]=useState<Input>({...thermalDefaults}),[attempt,setAttempt]=useState(0),[errors,setErrors]=useState<Record<string,string>>({});
 useEffect(()=>setEnhanced(true),[]);
 useEffect(()=>{if(attempt&&Object.keys(errors).length)errorRef.current?.focus();},[attempt]);
 const result=thermalModel(applied),rows=result.rows;
 const dirty=fields.some(({key})=>draft[key]!==applied[key]);
 const run=(event:FormEvent)=>{event.preventDefault();const candidate=thermalModel(draft);setErrors(candidate.errors);setAttempt(x=>x+1);if(!Object.keys(candidate.errors).length)setApplied({...draft});};
 const download=()=>{const url=URL.createObjectURL(new Blob([thermalCsv(rows)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='thermal-response.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const temperatures=rows.map(row=>Number(thermalNumber(row.temperature))),low=Math.min(...temperatures),high=Math.max(...temperatures),spread=high-low;
 const points=rows.map((row,index)=>`${20+index*52},${spread===0?70:120-(temperatures[index]-low)/spread*100}`).join(' ');
 return <div className="scientific-workspace">
  <p>Explore a fictional first-order thermal response. These calculated values are illustrative; they are not measured data or a design prediction.</p>
  <div className="science-regions"><section aria-labelledby={`${id}-inputs`}><h2 id={`${id}-inputs`}>Parameters</h2><p>Run the model to apply your changes. Results and downloads use the last successful run.</p>
   <form onSubmit={run} noValidate><fieldset disabled={!enhanced}><legend>Thermal response</legend>
   {fields.map(({key,label,hint})=><Field key={key} id={`${id}-${key}`} label={label} hint={hint} error={errors[key]}>{props=><TextInput {...props} type="number" step="any" required value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}/>}</Field>)}
   <Button type="submit">Run calculation</Button></fieldset>
   {Object.keys(errors).length>0&&<div className="science-errors" role="alert" tabIndex={-1} ref={errorRef}><h3>Check the parameters</h3><ul>{fields.filter(({key})=>errors[key]).map(({key})=><li key={key}><a href={`#${id}-${key}`}>{errors[key]}</a></li>)}</ul><p>The previous results remain available.</p></div>}
   </form><p hidden={enhanced}>Interactive calculations are unavailable. The example results remain available; reload to try again.</p><noscript><p>JavaScript is needed to run a calculation.</p></noscript></section>
  <section aria-labelledby={`${id}-results`}><h2 id={`${id}-results`}>Results</h2><p role="status">{dirty?'Parameters have changed. Results show the last successful calculation.':'Results show the current calculation.'}</p>
   <p>Model: ambient + (initial − ambient) × exp(−time ÷ time constant). Six evenly spaced samples are rounded to two decimal places.</p>
   <p>Last run: {applied.initial} °C initial; {applied.ambient} °C ambient; {applied.timeConstant} min time constant; {applied.duration} min duration.</p>
   <figure><svg viewBox="0 0 300 140" aria-hidden="true" focusable="false"><line x1="20" y1="120" x2="280" y2="120"/><line x1="20" y1="20" x2="20" y2="120"/><polyline points={points}/></svg><figcaption>Temperature over time, from {thermalNumber(low)} to {thermalNumber(high)} °C across {thermalNumber(rows[0].minutes)} to {thermalNumber(rows[rows.length-1].minutes)} minutes. Displayed values are in the table below.</figcaption></figure>
   <DataTable caption="Calculated temperature by time"><thead><tr><th scope="col">Time (min)</th><th scope="col">Temperature (°C)</th></tr></thead><tbody>{rows.map((row,index)=><tr key={index}><th scope="row">{thermalNumber(row.minutes)}</th><td>{thermalNumber(row.temperature)}</td></tr>)}</tbody></DataTable>
   <Button disabled={!enhanced} onClick={download}>Download results CSV</Button>
  </section></div>
 </div>;
}
