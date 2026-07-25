import React from 'react';
import { StatusErrorPage } from '@/components/shared/errors/StatusErrorPage';

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
