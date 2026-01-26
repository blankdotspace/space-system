import React from 'react';
import {Redirect} from '@docusaurus/router';

export default function Home(): React.JSX.Element {
  // Redirect to the docs README which serves as the landing page
  return <Redirect to="/README" />;
}
