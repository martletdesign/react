import {AppShell,family} from 'catalog-family';
import fixture from '../../../page-archetypes/content/catalog.json';
import {Workspace,type WorkspaceSection} from './Workspace';
import {Chat} from './Chat';
const section=(page:string):WorkspaceSection=>fixture.pages.find(item=>item.id===page)!.sections.find(item=>'kind' in item && item.kind==='workspace') as WorkspaceSection;
export function SpecimenApp(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight Field Institute" navigationPlacement="none" navigation={null} utilities={null}><h1>Local workspaces and conversation</h1><section aria-labelledby="observation-heading" data-observation><h2 id="observation-heading">Observation register</h2><Workspace section={section('workspace')}/></section><section aria-labelledby="fleet-heading" data-fleet><h2 id="fleet-heading">Example vehicle register</h2><Workspace section={section('fleet')}/></section><section aria-labelledby="chat-heading" data-conversation><h2 id="chat-heading">Workshop conversation</h2><Chat/></section></AppShell></div>}
