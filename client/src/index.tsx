import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import 'bootstrap/dist/css/bootstrap.css';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './assets/styles/_global.scss';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faAngleDown,
  faCalendarAlt,
  faCopy,
  faDownload,
  faEquals,
  faEraser,
  faExternalLinkSquareAlt,
  faFileImport,
  faFont,
  faFolderOpen,
  faHashtag,
  faHome,
  faLink,
  faListOl,
  faParagraph,
  faPlus,
  faProjectDiagram,
  faQuestion,
  faQuestionCircle,
  faSave,
  faSort,
  faSortDown,
  faSortNumericDown,
  faTable,
  faThLarge,
  faTimes,
  faToggleOff,
  faTrash,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import * as serviceWorker from './serviceWorker';
import App from './App';

library.add(
  faTimes,
  faExternalLinkSquareAlt,
  faPlus,
  faTrash,
  faSort,
  faDownload,
  faLink,
  faEquals,
  faCopy,
  faThLarge,
  faTable,
  faFont,
  faHashtag,
  faToggleOff,
  faCalendarAlt,
  faListOl,
  faParagraph,
  faQuestionCircle,
  faSortNumericDown,
  faAngleDown,
  faProjectDiagram,
  faHome,
  faSortDown,
  faQuestion,
  faSave,
  faFolderOpen,
  faEraser,
  faFileImport,
  faTrashAlt,
);

const rootDocument = document.getElementById('root');

ReactDOM.render(<App />, rootDocument);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
