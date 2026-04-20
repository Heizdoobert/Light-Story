import React from 'react';
import { StatusErrorPage } from '../shared/components/StatusErrorPage';

export const UnauthorizedPage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={401}
      title="Unauthorized"
      message="You need to sign in to access this page."
      actionLabel="Go To Home"
      actionHref="/"
    />
  );
};
