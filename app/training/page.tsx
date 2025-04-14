// app/training/page.tsx
"use client";

import { HMSPrebuilt } from '@100mslive/roomkit-react';

export default function Home() {
    return (
        <div style={{ height: '100vh' }}>
            <HMSPrebuilt roomCode="67fd389ab72a0fec60d0ba36" />
        </div>
    );
}
