import { AccessRequest, User } from "@server/models";
import { allow } from "./cancan";

allow(User, ["read", "update"], AccessRequest, (user, accessRequest) => {
  if (!accessRequest || user.teamId !== accessRequest.teamId) {
    return false;
  }
  return true;
});
