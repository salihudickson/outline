import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import Flex from "@shared/components/Flex";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import useStores from "~/hooks/useStores";
import useCurrentUser from "~/hooks/useCurrentUser";
import { navigateToHome } from "~/actions/definitions/navigation";

type Props = {
  documentId?: string;
  collectionId?: string;
};

const Error403 = ({ documentId, collectionId }: Props) => {
  const { t } = useTranslation();
  const history = useHistory();
  const params = useParams<{ documentSlug?: string }>();
  const { documents, collections, ui } = useStores();
  const user = useCurrentUser();
  const [requesting, setRequesting] = React.useState(false);
  const [requested, setRequested] = React.useState(false);

  // Try to determine the document/collection from URL if not provided
  const document = documentId
    ? documents.get(documentId)
    : params.documentSlug
    ? documents.get(params.documentSlug)
    : undefined;
  const collection = collectionId ? collections.get(collectionId) : undefined;

  const handleRequestAccess = React.useCallback(async () => {
    if (!user || (!document && !collection)) {
      return;
    }

    setRequesting(true);
    try {
      await documents.client.post("/accessRequests.create", {
        documentId: document?.id,
        collectionId: collection?.id,
      });
      setRequested(true);
      ui.showToast(
        t("Access request sent. You'll be notified when it's approved."),
        { type: "success" }
      );
    } catch (error) {
      ui.showToast(t("Failed to request access"), { type: "error" });
    } finally {
      setRequesting(false);
    }
  }, [user, document, collection, documents.client, ui, t]);

  const resourceName = document?.title || collection?.name;

  return (
    <Scene title={t("No access to this doc")}>
      <Heading>{t("No access to this doc")}</Heading>
      <Flex gap={20} style={{ maxWidth: 500 }} column>
        <Empty size="large">
          {t(
            "It doesn't look like you have permission to access this document."
          )}{" "}
          {resourceName && !requested
            ? t("You can request access below.")
            : t("Please request access from the document owner.")}
        </Empty>
        <Flex gap={8}>
          <Button action={navigateToHome} hideIcon>
            {t("Home")}
          </Button>
          <Button onClick={history.goBack} neutral>
            {t("Go back")}
          </Button>
          {user && (document || collection) && !requested && (
            <Button
              onClick={handleRequestAccess}
              disabled={requesting}
              primary
            >
              {requesting ? t("Requesting...") : t("Request Access")}
            </Button>
          )}
        </Flex>
      </Flex>
    </Scene>
  );
};

export default Error403;
