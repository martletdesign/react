import {SourceShell} from '../shell/SourceShell';
import {ScientificWorkspace} from './Workspace';
import './page.css';
export function ScientificPage(){return <SourceShell current="scientific-workspace" title="Thermal analysis"><div className="scientific-page"><header><h1>Thermal analysis</h1><p>An illustrative thermal response, calculated locally.</p></header><ScientificWorkspace/></div></SourceShell>}
