import { Button } from "~/components/button/button.component";
import { useAccountScope } from "~/lib/accounts/account-scope.hooks";
import { accountName } from "~/lib/accounts/account-names";
import { useAddAccountDialog } from "~/lib/accounts/add-account-dialog.store";

/** Import a new portfolio or explicitly update the one currently selected. */
export function ImportInventoryActions() {
  const { accountId, scoped } = useAccountScope();
  const openAdd = useAddAccountDialog((state) => state.openAdd);
  const openExisting = useAddAccountDialog((state) => state.openReauth);
  const account = scoped.find((candidate) => candidate.steamId === accountId);
  return (
    <>
      <Button
        small
        disabled={!account}
        title={
          account
            ? `Replace the latest items in ${accountName(account)}; saved history is preserved.`
            : "Choose one portfolio to import into an existing inventory."
        }
        onClick={() => {
          if (accountId) openExisting(accountId);
        }}
      >
        Import into this inventory
      </Button>
      <Button small onClick={openAdd}>
        Import inventory
      </Button>
    </>
  );
}
