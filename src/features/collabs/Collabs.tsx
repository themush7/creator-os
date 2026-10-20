import { useMemo, useState } from 'react';
import { useAppData } from '@/app/data';
import { ScreenHeader, screenStyles } from '@/app/Screen';
import { useToday } from '@/app/today';
import { Chip, ChipScroller } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { SearchField } from '@/components/SearchField';
import {
  COLLAB_FILTERS,
  collabFilterCounts,
  filterCollabs,
  type CollabFilter,
} from '@/domain/lists';
import { CollabCard } from '../shared/CollabCard';
import { Skeleton, sharedStyles } from '../shared/List';

const FILTER_KEY = 'creator-os.collabs-filter';

function readFilter(): CollabFilter {
  try {
    const v = sessionStorage.getItem(FILTER_KEY);
    return (COLLAB_FILTERS as readonly string[]).includes(v ?? '') ? (v as CollabFilter) : 'Active';
  } catch {
    return 'Active';
  }
}

export function Collabs() {
  const today = useToday();
  const { ready, index } = useAppData();
  const [filter, setFilterState] = useState<CollabFilter>(readFilter);
  const [query, setQuery] = useState('');

  const setFilter = (f: CollabFilter) => {
    setFilterState(f);
    try {
      sessionStorage.setItem(FILTER_KEY, f);
    } catch {
      /* preference only */
    }
  };

  const counts = useMemo(() => collabFilterCounts(index, today), [index, today]);
  const list = useMemo(
    () => filterCollabs(index, filter, query, today),
    [index, filter, query, today],
  );
  const q = query.trim();

  return (
    <>
      <ScreenHeader
        title="Collabs"
        aside={ready ? `${list.length} ${list.length === 1 ? 'collab' : 'collabs'}` : undefined}
      />
      <div className={screenStyles.body} style={{ paddingTop: 12 }}>
        <SearchField value={query} onChange={setQuery} placeholder="Search brands and campaigns" />
      </div>
      <ChipScroller label="Filter collaborations">
        {COLLAB_FILTERS.map((f) => (
          <Chip
            key={f}
            label={f}
            meta={String(counts[f])}
            selected={filter === f}
            onSelect={() => setFilter(f)}
          />
        ))}
      </ChipScroller>
      <div className={screenStyles.body} style={{ paddingTop: 8 }}>
        {!ready ? (
          <Skeleton height={150} count={4} />
        ) : list.length ? (
          <div className={sharedStyles.cards}>
            {list.map((c) => (
              <CollabCard key={c.id} collab={c} index={index} today={today} from="Collabs" />
            ))}
          </div>
        ) : (
          <EmptyState>
            {q
              ? `No matches for “${q}”.`
              : index.data.collabs.length
                ? `Nothing in ${filter.toLowerCase()}.`
                : 'No collaborations yet. Tap Add to start.'}
          </EmptyState>
        )}
      </div>
    </>
  );
}
