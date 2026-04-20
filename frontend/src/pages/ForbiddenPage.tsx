import React from 'react';
import { StatusErrorPage } from '../shared/components/StatusErrorPage';

export const ForbiddenPage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={403}
      title="Forbidden"
      message="You do not have permission to access this resource."
      actionLabel="Return Home"
      actionHref="/"
    />
  );
};
