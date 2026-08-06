import React from 'react';
import { StatusErrorPage } from '@/components/errors/StatusErrorPage';
import { ROUTES } from '@/lib/constants/routes';

export const NotFoundPage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={404}
      title="Page Not Found"
      message="The page you requested does not exist or may have been moved."
      actionLabel="Return Home"
      actionHref={ROUTES.HOME}
    />
  );
};
