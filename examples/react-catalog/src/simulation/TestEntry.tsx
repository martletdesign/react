import {hydrateRoot} from 'react-dom/client';
import {SimulationHarness} from './TestHarness';
hydrateRoot(document.getElementById('root')!,<SimulationHarness/>);
