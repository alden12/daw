import RxFM, { addToView } from 'rxfm';
import { css } from '@emotion/css';
import { Daw } from './Daw';

import './styles.css';

const title = css`
  color: red;
  &:hover {
    color: pink;
  }
`;

const App = () => <div id="app">
  <span class={title}>DAW</span>
  <Daw />
</div>;

// App().subscribe(element => document.body.appendChild(element));
addToView(<App />, document.body);
