import React from 'react';
import { StatusErrorPage } from '../shared/components/StatusErrorPage';

export const ServiceUnavailablePage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={503}
      title="Service Unavailable"
      message="The service is temporarily unavailable. Please try again in a few minutes."
      actionLabel="Reload"
      actionHref="/"
      showReload
    />
  );
};
