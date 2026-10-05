import React from 'react';
import ReactDOM from 'react-dom/client';
import Page from './Page';
import { editablePageIds, type EditablePageId } from './lib/siteContent';
import './index.css';

const pageId = document.documentElement.dataset.page;
const isEditablePageId = (value: string | undefined): value is EditablePageId =>
  editablePageIds.some(editablePageId => editablePageId === value);

if (!isEditablePageId(pageId)) {
  throw new Error(`Unknown CMS page: ${pageId ?? '(missing data-page attribute)'}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Page pageId={pageId} />
  </React.StrictMode>,
);
