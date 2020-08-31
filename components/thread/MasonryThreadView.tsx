import React from "react";
import {
  Post,
  PostSizes,
  MasonryView,
  // @ts-ignore
} from "@bobaboard/ui-components";
import debug from "debug";
import {
  getTotalContributions,
  getTotalNewContributions,
  UNCATEGORIZED_LABEL,
} from "../../utils/thread-utils";
import moment from "moment";
import { useThread } from "components/thread/ThreadContext";
import { useRouter } from "next/router";

const log = debug("bobafrontend:threadLevel-log");

const MasonryThreadView: React.FC<{
  onNewComment: (
    replyToPostId: string,
    replyToCommentId: string | null
  ) => void;
  onNewContribution: (id: string) => void;
  isLoggedIn: boolean;
}> = (props) => {
  const {
    baseUrl,
    chronologicalPostsSequence,
    parentChildrenMap,
    categoryFilterState,
  } = useThread();
  const masonryRef = React.createRef<{ reposition: () => void }>();
  const router = useRouter();

  // @ts-ignore
  let [unusedFirstElement, ...unfilteredArray] = chronologicalPostsSequence;

  const activeCategories = categoryFilterState.filter(
    (category) => category.active
  );
  const isUntaggedActive = activeCategories.some(
    (category) => category.name == UNCATEGORIZED_LABEL
  );
  let orderedPosts = unfilteredArray;
  if (activeCategories.length != categoryFilterState.length) {
    orderedPosts = unfilteredArray.filter(
      (post) =>
        (post.tags.categoryTags.length == 0 && isUntaggedActive) ||
        post.tags.categoryTags.some((category) =>
          activeCategories.some(
            (activeCategory) => category == activeCategory.name
          )
        )
    );
  }
  log(isUntaggedActive);
  log(orderedPosts);

  if (!orderedPosts.length) {
    return <div>The gallery is empty :(</div>;
  }

  return (
    <MasonryView ref={masonryRef}>
      {
        orderedPosts.map((post) => (
          <div
            className="post"
            key={post.postId}
            // TODO: figure out why this is necessary.
            // Right now it's here because there is a bug in the masonry view where
            // when the elements are changed the positions are recalculated but, for some reason,
            // position: absolute isn't maintained in certain divs. I assume it has somethign to do
            // with react and re-rendering, but honestly I have no idea.
            style={{ position: "absolute" }}
          >
            <Post
              key={post.postId}
              size={post.options?.wide ? PostSizes.WIDE : PostSizes.REGULAR}
              createdTime={moment.utc(post.created).fromNow()}
              createdTimeLink={{
                href: `${baseUrl}/${post.postId}/`,
                onClick: () => {
                  router
                    .push(
                      `/[boardId]/thread/[...threadId]`,
                      `${baseUrl}/${post.postId}`,
                      {
                        shallow: true,
                      }
                    )
                    .then(() => {
                      window.scrollTo(0, 0);
                    });
                },
              }}
              text={post.content}
              secretIdentity={post.secretIdentity}
              userIdentity={post.userIdentity}
              onNewContribution={() => props.onNewContribution(post.postId)}
              onNewComment={() => props.onNewComment(post.postId, null)}
              totalComments={post.comments?.length}
              directContributions={
                parentChildrenMap.get(post.postId)?.children.length
              }
              totalContributions={getTotalContributions(
                post,
                parentChildrenMap
              )}
              newPost={props.isLoggedIn && post.isNew}
              newComments={props.isLoggedIn ? post.newCommentsAmount : 0}
              newContributions={
                props.isLoggedIn
                  ? getTotalNewContributions(post, parentChildrenMap)
                  : 0
              }
              onNotesClick={() => {
                router
                  .push(
                    `/[boardId]/thread/[...threadId]`,
                    `${baseUrl}/${post.postId}`,
                    {
                      shallow: true,
                    }
                  )
                  .then(() => {
                    window.scrollTo(0, 0);
                  });
              }}
              notesUrl={`${baseUrl}/${post.postId}/`}
              tags={post.tags}
              onEmbedLoaded={() => masonryRef.current?.reposition()}
            />
          </div>
        )) as any // TODO: figure out why it doesn't work without casting
      }
      <style jsx>{`
        .post {
          max-width: min(45%, 550px);
        }
        @media only screen and (max-width: 550px) {
          .post {
            max-width: 100%;
          }
        }
      `}</style>
    </MasonryView>
  );
};

export default MasonryThreadView;
