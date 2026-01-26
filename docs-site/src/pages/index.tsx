import React from 'react';
import {Redirect} from '@docusaurus/router';

export default function Home(): React.JSX.Element {
  // Redirect to the docs landing page
  return <Redirect to="/docs/" />;
}
