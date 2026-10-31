"use client";

import { someExport } from '@/sdk';

export default function Page() {
  console.log('someExport:', someExport);
  return <div>SDK test page</div>;
}
