import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');

if (container) {
  // To completely avoid the "already passed to createRoot()" warning during 
  // hot reloads or multiple script executions, we replace the root element 
  // with a fresh clone before mounting. This ensures React always gets a 
  // pristine DOM node without any leftover internal state.
  const freshContainer = container.cloneNode(false) as HTMLElement;
  container.parentNode?.replaceChild(freshContainer, container);

  const root = createRoot(freshContainer);
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
