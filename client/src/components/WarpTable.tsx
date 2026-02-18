import { useRef, useEffect } from 'react';
import './WarpTable.css';

interface WarpTableProps {
  data: unknown;
}

export default function WarpTable({ data }: WarpTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data === null || data === undefined) {
      return;
    }

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Exact implementation of the Warp parse function
    function parse(object: any, node: HTMLElement) {
      for (const x in object) {
        const tr = document.createElement('TR');
        tr.setAttribute('type', typeof object[x]);
        tr.setAttribute('class', x);

        const td1 = document.createElement('TD');
        td1.setAttribute('class', 'name');
        td1.setAttribute('style', 'white-space: pre-wrap;');
        td1.textContent = x;
        tr.appendChild(td1);
        node.appendChild(tr);

        if (object[x] !== null && typeof object[x] === 'object') {
          // Nested object or array
          const table = document.createElement('TABLE');
          const tbody = document.createElement('TBODY');
          table.appendChild(tbody);
          table.setAttribute('type', 'object');
          table.setAttribute('class', x);
          parse(object[x], tbody);

          if (table.getElementsByTagName('tr')[0]) {
            tr.appendChild(table);
          } else {
            // Empty object/array
            const td2 = document.createElement('TD');
            td2.setAttribute('class', 'value');
            tr.appendChild(td2);
          }
        } else {
          // Primitive value
          const val = object[x] === null ? '' : object[x];
          tr.setAttribute('value', String(val));
          const td2 = document.createElement('TD');
          td2.setAttribute('class', 'value');
          td2.innerHTML = String(val);
          tr.appendChild(td2);
          node.appendChild(tr);
        }
      }
    }

    // Create root table
    const table = document.createElement('TABLE');
    const tbody = document.createElement('TBODY');
    table.appendChild(tbody);
    containerRef.current.appendChild(table);

    // Parse the data into the table
    parse(data, tbody);
  }, [data]);

  return <div ref={containerRef} className="warp-table-container" />;
}
