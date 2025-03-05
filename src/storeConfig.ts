import { RefObject } from 'react';
import { AjaxStore } from '@bryntum/grid';
import { BryntumTreeGrid } from '@bryntum/grid-react';
import { GitHubIssueModel } from './lib/GitHubIssueModel';
import { NetworkValueTypes } from './components/Grid';

type OnAfterRequest = Response & {
  parsedJson: {
    endCursor: string;
    commentEndCursor: string;
    total: number;
  };
};

export function createGitHubIssueStore(
    gridRef: RefObject<BryntumTreeGrid | null>,
    endCursorRef: RefObject<string | null>,
    commentEndCursorRef: RefObject<string | null>,
    setNetworkValue: (value: NetworkValueTypes) => void
): AjaxStore {
    return new AjaxStore({
        tree            : true,
        filterParamName : 'filters',
        modelClass      : GitHubIssueModel,
        readUrl         : '/api/read',
        onBeforeLoad(event) {
            (event.params as
                {
                    endCursor: string | null;
                    commentEndCursor: string | null
                }
            ).endCursor = endCursorRef.current;
            (event.params as {
              endCursor: string | null;
              commentEndCursor: string | null
            }).commentEndCursor = commentEndCursorRef.current;
        },
        onAfterRequest({ response }) {
            const res = response as OnAfterRequest;
            // end cursor for lazy loading issues
            if (res.parsedJson.commentEndCursor === undefined) {
                endCursorRef.current = res.parsedJson.endCursor;
            }
            // end cursor for lazy loading comments
            else {
                commentEndCursorRef.current = res.parsedJson.commentEndCursor;
            }

            if (gridRef.current?.instance && res.parsedJson.total) {
                // @ts-expect-error getById is not in the type definition
                const column = gridRef.current.instance.columns.getById('IssuesAndComments');
                if (column) {
                    column.set({
                        text : `Total issues: ${res.parsedJson.total}`
                    });
                }
            }
        },
        lazyLoad : {
            chunkSize : 100 // default value
        },
        listeners : {
            lazyLoadStarted() {
                setNetworkValue({
                    text  : 'Loading',
                    color : 'blue'
                });
            },
            lazyLoadEnded() {
                setNetworkValue({
                    text  : 'Idle',
                    color : 'green'
                });
            }
        },
        autoLoad : true
    });
}