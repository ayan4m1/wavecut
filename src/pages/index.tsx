import Editor from '../components/Editor';
import SidePanel from '../components/SidePanel';
import { Row } from 'react-bootstrap';

export const Component = () => {
  return (
    <Row>
      <Editor />
      <SidePanel />
    </Row>
  );
};
