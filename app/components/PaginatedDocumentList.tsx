import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import BulkSelectionToolbar from "~/components/BulkSelectionToolbar";
import DocumentListItem from "~/components/DocumentListItem";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import useStores from "~/hooks/useStores";

type Props = {
  documents: Document[];
  fetch: (options: any) => Promise<Document[] | undefined>;
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: JSX.Element;
  showParentDocuments?: boolean;
  showCollection?: boolean;
  showPublished?: boolean;
  showDraft?: boolean;
  showTemplate?: boolean;
  /** Whether to enable bulk selection on this list */
  showCheckbox?: boolean;
};

const PaginatedDocumentList = observer(function PaginatedDocumentList({
  empty,
  heading,
  documents,
  fetch,
  options,
  showParentDocuments,
  showCollection,
  showPublished,
  showTemplate,
  showDraft,
  showCheckbox = true,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const { documents: documentsStore } = useStores();

  // Clear selection when unmounting
  React.useEffect(
    () => () => {
      documentsStore.clearSelection();
    },
    [documentsStore]
  );

  return (
    <>
      <PaginatedList<Document>
        aria-label={t("Documents")}
        items={documents}
        empty={empty}
        heading={heading}
        fetch={fetch}
        options={options}
        renderError={(props) => <Error {...props} />}
        renderItem={(item, _index) => (
          <DocumentListItem
            key={item.id}
            document={item}
            showParentDocuments={showParentDocuments}
            showCollection={showCollection}
            showPublished={showPublished}
            showTemplate={showTemplate}
            showDraft={showDraft}
            showCheckbox={showCheckbox}
          />
        )}
        {...rest}
      />
      <BulkSelectionToolbar />
    </>
  );
});

export default PaginatedDocumentList;
