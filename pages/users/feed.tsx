import React from "react";
import { Post, PostSizes, FeedWithMenu, toast } from "@bobaboard/ui-components";
import Layout from "../../components/Layout";
import { useInfiniteQuery, queryCache, useMutation } from "react-query";
import { useAuth } from "../../components/Auth";
import { useBoardContext } from "../../components/BoardContext";
import { markThreadAsRead, muteThread, hideThread } from "../../utils/queries";
import { getUserActivityData } from "../../utils/queries/user";
import debug from "debug";
import moment from "moment";
import { ThreadType } from "../../types/Types";

import {
  removeThreadActivityFromCache,
  setThreadHiddenInCache,
  setThreadMutedInCache,
} from "../../utils/queries/cache";
import { createLinkTo, THREAD_URL_PATTERN } from "utils/link-utils";

const log = debug("bobafrontend:boardPage-log");
const info = debug("bobafrontend:boardPage-info");
info.log = console.info.bind(console);

const MemoizedPost = React.memo(Post);

function UserFeedPage() {
  const [showSidebar, setShowSidebar] = React.useState(false);
  const { isLoggedIn } = useAuth();
  const boardsData = useBoardContext();
  const threadRedirectMethod = React.useRef(
    new Map<
      string,
      {
        href: string;
        onClick: () => void;
      }
    >()
  );

  const {
    data: userActivityData,
    isFetching: isFetchingUserActivity,
    isFetchingMore,
    fetchMore,
    canFetchMore,
  } = useInfiniteQuery(["userActivityData"], getUserActivityData, {
    getFetchMore: (lastGroup, allGroups) => {
      // TODO: if this method     bfires too often in a row, sometimes there's duplicate
      // values within allGroups (aka groups fetched with the same cursor).
      // This seems to be a library problem.
      return lastGroup?.nextPageCursor;
    },
  });

  const [readThread] = useMutation(
    ({ threadId }: { threadId: string; slug: string }) =>
      markThreadAsRead({ threadId }),
    {
      onMutate: ({ threadId, slug }) => {
        log(`Optimistically marking thread ${threadId} as visited.`);
        removeThreadActivityFromCache({ slug, categoryFilter: null, threadId });
      },
      onError: (error: Error, threadId) => {
        toast.error("Error while marking thread as visited");
        log(`Error while marking thread ${threadId} as visited:`);
        log(error);
      },
      onSuccess: (data: boolean, threadId) => {
        log(`Successfully marked thread ${threadId} as visited.`);
      },
    }
  );

  const [setThreadMuted] = useMutation(
    ({ threadId, mute }: { threadId: string; mute: boolean; slug: string }) =>
      muteThread({ threadId, mute }),
    {
      onMutate: ({ threadId, mute, slug }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            mute ? "muted" : "unmuted"
          }.`
        );
        setThreadMutedInCache({
          slug,
          categoryFilter: null,
          threadId,
          mute,
        });
      },
      onError: (error: Error, { threadId, mute }) => {
        toast.error(
          `Error while marking thread as ${mute ? "muted" : "unmuted"}`
        );
        log(`Error while marking thread ${threadId} as muted:`);
        log(error);
      },
      onSuccess: (data: boolean, { threadId, mute }) => {
        log(
          `Successfully marked thread ${threadId} as  ${
            mute ? "muted" : "unmuted"
          }.`
        );
        queryCache.invalidateQueries("allBoardsData");
      },
    }
  );

  const [setThreadHidden] = useMutation(
    ({ threadId, hide }: { threadId: string; slug: string; hide: boolean }) =>
      hideThread({ threadId, hide }),
    {
      onMutate: ({ threadId, hide, slug }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            hide ? "hidden" : "visible"
          }.`
        );
        setThreadHiddenInCache({
          slug,
          categoryFilter: null,
          threadId,
          hide,
        });
      },
      onError: (error: Error, { threadId, hide }) => {
        toast.error(
          `Error while marking thread as ${hide ? "hidden" : "visible"}`
        );
        log(`Error while marking thread ${threadId} as hidden:`);
        log(error);
      },
      onSuccess: (data: boolean, { threadId, hide }) => {
        log(
          `Successfully marked thread ${threadId} as  ${
            hide ? "hidden" : "visible"
          }.`
        );
        queryCache.invalidateQueries("allBoardsData");
      },
    }
  );

  const getMemoizedRedirectMethod = (data: {
    slug: string;
    threadId: string;
  }) => {
    if (!threadRedirectMethod.current?.has(data.threadId)) {
      info(`Creating new handler for thread id: ${data.threadId}`);
      threadRedirectMethod.current?.set(
        data.threadId,
        createLinkTo({
          urlPattern: THREAD_URL_PATTERN,
          url: `/!${data.slug}/thread/${data.threadId}`,
        })
      );
    }
    info(`Returning handler for thread id: ${data.threadId}`);
    // This should never be null
    return threadRedirectMethod.current?.get(data.threadId) || (() => {});
  };

  const showEmptyMessage =
    !isFetchingUserActivity && userActivityData?.[0]?.activity?.length === 0;

  return (
    <div className="main">
      <Layout
        mainContent={
          <FeedWithMenu
            onCloseSidebar={() => setShowSidebar(false)}
            showSidebar={showSidebar}
            sidebarContent={<></>}
            feedContent={
              <div className="main">
                {showEmptyMessage && (
                  <img className="empty" src={"/nothing.jpg"} />
                )}
                {userActivityData &&
                  userActivityData
                    .flatMap((activityData) => activityData?.activity)
                    .map((thread: ThreadType) => {
                      const post = thread.posts[0];
                      const hasReplies =
                        thread.totalPostsAmount > 1 ||
                        thread.totalCommentsAmount > 0;
                      const redirectMethod = getMemoizedRedirectMethod({
                        slug: thread.boardSlug,
                        threadId: thread.threadId,
                      });
                      if (thread.hidden) {
                        return (
                          <div className="post hidden" key={thread.threadId}>
                            This thread was hidden{" "}
                            <a
                              href="#"
                              onClick={(e) => {
                                setThreadHidden({
                                  threadId: thread.threadId,
                                  slug: thread.boardSlug,
                                  hide: !thread.hidden,
                                });
                                e.preventDefault();
                              }}
                            >
                              [unhide]
                            </a>
                          </div>
                        );
                      }
                      // TODO: memoize whole div
                      return (
                        <div className="post" key={`${post.postId}_container`}>
                          <MemoizedPost
                            key={post.postId}
                            createdTime={`${moment
                              .utc(post.created)
                              .fromNow()}${
                              hasReplies
                                ? ` [updated: ${moment
                                    .utc(thread.lastActivity)
                                    .fromNow()}]`
                                : ""
                            }`}
                            createdTimeLink={redirectMethod}
                            text={post.content}
                            tags={post.tags}
                            secretIdentity={post.secretIdentity}
                            userIdentity={post.userIdentity}
                            onNewContribution={() => {}}
                            onNewComment={() => {}}
                            size={
                              post?.options?.wide
                                ? PostSizes.WIDE
                                : PostSizes.REGULAR
                            }
                            newPost={isLoggedIn && !thread.muted && post.isNew}
                            newComments={
                              isLoggedIn &&
                              (thread.muted
                                ? undefined
                                : thread.newCommentsAmount)
                            }
                            board={{
                              slug: `!${thread.boardSlug}`,
                              accentColor:
                                boardsData[thread.boardSlug]?.accentColor,
                            }}
                            newContributions={
                              isLoggedIn &&
                              (thread.muted
                                ? undefined
                                : thread.newPostsAmount - (post.isNew ? 1 : 0))
                            }
                            totalComments={thread.totalCommentsAmount}
                            // subtract 1 since posts_amount is the amount of posts total in the thread
                            // including the head one.-
                            totalContributions={thread.totalPostsAmount - 1}
                            directContributions={thread.directThreadsAmount}
                            notesLink={redirectMethod}
                            muted={isLoggedIn && thread.muted}
                            menuOptions={[
                              {
                                name: "Copy Link",
                                link: {
                                  onClick: () => {
                                    const tempInput = document.createElement(
                                      "input"
                                    );
                                    tempInput.value = new URL(
                                      (redirectMethod as any)?.href,
                                      window.location.origin
                                    ).toString();
                                    document.body.appendChild(tempInput);
                                    tempInput.select();
                                    document.execCommand("copy");
                                    document.body.removeChild(tempInput);
                                    toast.success("Link copied!");
                                  },
                                },
                              },
                              // Add options just for logged in users
                              ...(isLoggedIn
                                ? [
                                    {
                                      name: "Mark Visited",
                                      link: {
                                        onClick: () => {
                                          readThread({
                                            threadId: thread.threadId,
                                            slug: thread.boardSlug,
                                          });
                                        },
                                      },
                                    },
                                    {
                                      name: thread.muted ? "Unmute" : "Mute",
                                      link: {
                                        onClick: () => {
                                          setThreadMuted({
                                            threadId: thread.threadId,
                                            slug: thread.boardSlug,
                                            mute: !thread.muted,
                                          });
                                        },
                                      },
                                    },
                                    {
                                      name: thread.hidden ? "Unhide" : "Hide",
                                      link: {
                                        onClick: () => {
                                          setThreadHidden({
                                            threadId: thread.threadId,
                                            slug: thread.boardSlug,
                                            hide: !thread.hidden,
                                          });
                                        },
                                      },
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      );
                    })}
                <div className="loading">
                  {!showEmptyMessage &&
                    userActivityData?.length &&
                    (isFetchingMore
                      ? "Loading more..."
                      : canFetchMore
                      ? "..."
                      : "Nothing more to load")}
                </div>
              </div>
            }
            onReachEnd={() => {
              info(`Attempting to fetch more...`);
              info(canFetchMore);
              if (canFetchMore && !isFetchingMore) {
                info(`...found stuff!`);
                fetchMore();
                return;
              }
              info(
                isFetchingMore
                  ? `...but we're already fetching`
                  : `...but there's nothing!`
              );
            }}
          />
        }
        title={`Your Stuff`}
        onTitleClick={createLinkTo({ url: "/users/feed" })?.onClick}
        forceHideTitle={true}
        loading={isFetchingUserActivity}
      />
      <style jsx>{`
        .main {
          width: 100%;
        }
        .post.hidden {
          max-width: 500px;
          width: calc(100% - 40px);
          background-color: gray;
          padding: 20px;
          border: 1px dashed black;
          border-radius: 15px;
        }
        .post {
          margin: 20px auto;
          margin-bottom: 30px;
          width: 100%;
        }
        .post > :global(div) {
          margin: 0 auto;
        }
        .empty {
          margin: 0 auto;
          display: block;
          margin-top: 30px;
          filter: grayscale(0.4);
          max-width: 100%;
        }
        .loading {
          text-align: center;
          margin-bottom: 20px;
          color: white;
        }
        .under-construction {
          width: 50px;
          margin: 0 auto;
          display: block;
          opacity: 0.5;
          filter: grayscale(0.4);
        }
      `}</style>
    </div>
  );
}

export default UserFeedPage;
