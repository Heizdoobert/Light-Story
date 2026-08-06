import React from 'react';
import { StatusErrorPage } from '@/components/errors/StatusErrorPage';
import { ROUTES } from '@/lib/constants/routes';

export const ServiceUnavailablePage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={503}
      title="Service Unavailable"
      message="The service is temporarily unavailable. Please try again in a few minutes."
      actionLabel="Reload"
      actionHref={ROUTES.HOME}
      showReload
    />
  );
};
