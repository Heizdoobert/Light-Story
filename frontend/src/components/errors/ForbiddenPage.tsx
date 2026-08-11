import React from 'react';
import { StatusErrorPage } from '@/components/errors/StatusErrorPage';
import { ROUTES } from '@/lib/constants/routes';

export const ForbiddenPage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={403}
      title="Forbidden"
      message="You do not have permission to access this resource."
      actionLabel="Return Home"
      actionHref={ROUTES.HOME}
    />
  );
};
