import { toast } from "@bobaboard/ui-components";
import { useMutation, useQueryClient } from "react-query";
import {
  markThreadAsRead,
  muteThread,
  hideThread,
} from "../../../utils/queries";
import debug from "debug";
import { ThreadType } from "../../../types/Types";
import { updateThreadView } from "../../../utils/queries/post";
import { useAuth } from "components/Auth";
import {
  setThreadActivityClearedInCache,
  setThreadDefaultViewInCache,
  setThreadHiddenInCache,
  setThreadMutedInCache,
} from "cache/thread";

const error = debug("bobafrontend:hooks:queries:thread-error");
const log = debug("bobafrontend:hooks:queries:thread-log");

export const useMuteThread = () => {
  const queryClient = useQueryClient();
  const { mutate: setThreadMuted } = useMutation(
    ({ threadId, mute }: { threadId: string; mute: boolean; slug: string }) =>
      muteThread({ threadId, mute }),
    {
      onMutate: ({ threadId, mute, slug }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            mute ? "muted" : "unmuted"
          }.`
        );
        setThreadMutedInCache(queryClient, {
          slug,
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
        queryClient.invalidateQueries("allBoardsData");
      },
    }
  );

  return setThreadMuted;
};

export const useSetThreadView = () => {
  const queryClient = useQueryClient();
  const { mutate: setThreadView } = useMutation(
    ({
      threadId,
      view,
    }: {
      threadId: string;
      view: ThreadType["defaultView"];
      slug: string;
    }) => updateThreadView({ threadId, view }),
    {
      onMutate: ({ threadId, view, slug }) => {
        log(
          `Optimistically switched thread ${threadId} to default view ${view}.`
        );
        setThreadDefaultViewInCache(queryClient, {
          slug,
          categoryFilter: null,
          threadId,
          view,
        });
        toast.success("Thread view updated!");
      },
      onError: (error: Error, { threadId, view }) => {
        toast.error(
          `Error while switching thread ${threadId} to default view ${view}.`
        );
        log(error);
      },
      onSuccess: (_, { threadId, view }) => {
        log(
          `Successfully switched thread ${threadId} to default view ${view}.`
        );
      },
    }
  );

  return setThreadView;
};

export const useSetThreadHidden = () => {
  const queryClient = useQueryClient();
  const { mutate: setThreadHidden } = useMutation(
    ({ threadId, hide }: { threadId: string; hide: boolean; slug: string }) =>
      hideThread({ threadId, hide }),
    {
      onMutate: ({ threadId, hide, slug }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            hide ? "hidden" : "visible"
          }.`
        );
        setThreadHiddenInCache(queryClient, {
          slug,
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
        queryClient.invalidateQueries("allBoardsData");
      },
    }
  );
  return setThreadHidden;
};

export const useReadThread = () => {
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();
  // Mark thread as read on authentication and thread fetch
  const { mutate: readThread } = useMutation(
    ({ threadId }: { threadId: string; slug: string }) => {
      if (!isLoggedIn) {
        throw new Error("Attempt to read thread with no user logged in.");
      }
      if (!threadId) {
        return Promise.resolve(null);
      }
      return markThreadAsRead({ threadId });
    },
    {
      onMutate: ({ threadId, slug }) => {
        if (!threadId || !slug) {
          return;
        }
        log(`Optimistically marking thread ${threadId} as visited.`);
        setThreadActivityClearedInCache(queryClient, {
          slug,
          threadId,
        });
      },
      onError: (serverError: Error, threadId) => {
        toast.error("Error while marking thread as visited");
        error(`Error while marking thread ${threadId} as visited:`);
        error(serverError);
      },
      onSuccess: (data: boolean, { threadId }) => {
        log(`Successfully marked thread ${threadId} as visited.`);
      },
    }
  );

  return readThread;
};
