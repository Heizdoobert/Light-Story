import React from 'react';
import { StatusErrorPage } from '@/components/errors/StatusErrorPage';
import { ROUTES } from '@/lib/constants/routes';

export const UnauthorizedPage: React.FC = () => {
  return (
    <StatusErrorPage
      statusCode={401}
      title="Unauthorized"
      message="You need to sign in to access this page."
      actionLabel="Go To Home"
      actionHref={ROUTES.HOME}
    />
  );
};
