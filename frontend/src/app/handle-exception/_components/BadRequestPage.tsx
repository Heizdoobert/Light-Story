import React from 'react';
import { StatusErrorPage } from '@/components/shared/StatusErrorPage';

export const BadRequestPage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={400}
      title="Bad Request"
      message="The request is invalid. Please review the input and try again."
      actionLabel="Back To Home"
      actionHref="/"
    />
  );
};
