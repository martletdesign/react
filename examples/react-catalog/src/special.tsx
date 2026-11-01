import {Gallery,type GallerySection} from './interactive/Gallery';
import {Workspace,type WorkspaceSection} from './interactive/Workspace';
import {Chat} from './interactive/Chat';
import {Sensors,Scene} from './simulation/Simulations';
export function renderSpecial(section:unknown) {
 const entry=section as {kind?:string};
 switch(entry.kind){
  case 'gallery':return <Gallery section={section as GallerySection}/>;
  case 'workspace':return <Workspace section={section as WorkspaceSection}/>;
  case 'chat':return <Chat/>;
  case 'sensors':return <Sensors/>;
  case 'scene':return <Scene/>;
  default:throw Error(`Unsupported interactive section: ${entry.kind}`);
 }
}
