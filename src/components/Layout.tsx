import { Fragment } from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from 'react-bootstrap';

// import { routes } from '../routes';

// only titled routes get a nav entry - the index route is reachable via the brand
// const navRoutes = routes.filter((route) => route.path && route.handle?.title);

export default function Layout() {
  return (
    <Fragment>
      <Container className="h-100" fluid>
        <Outlet />
      </Container>
    </Fragment>
  );
}
