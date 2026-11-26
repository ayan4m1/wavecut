import { Fragment } from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from 'react-bootstrap';

export default function Layout() {
  return (
    <Fragment>
      <Container className="h-100" fluid>
        <Outlet />
      </Container>
    </Fragment>
  );
}
