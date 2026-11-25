import { Row } from 'react-bootstrap';

import Editor from '../components/Editor';
import SidePanel from '../components/SidePanel';

export const Component = () => {
  return (
    <Row>
      <Editor />
      <SidePanel />
    </Row>
  );
};
