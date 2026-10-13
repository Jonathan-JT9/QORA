import React from 'react';
import HistoryTable from '../components/HistoryTable';

export default function HistoryPage({ onSelectCase }) {
  return (
    <div className="space-y-6">
      <HistoryTable onSelectCase={onSelectCase} />
    </div>
  );
}
