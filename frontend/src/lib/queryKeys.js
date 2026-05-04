export const queryKeys = {
  dashboard: (token) => ["dashboard", token],
  interns: (token, query) => ["interns", token, query],
  managers: (token) => ["managers", token],
  reviews: (token) => ["reviews", token],
  approvals: (token) => ["approvals", token],
  notifications: (token, unreadOnly) => ["notifications", token, unreadOnly],
  profile: (token, userId) => ["profile", token, userId ?? "me"],
  topicProgress: (token) => ["topicProgress", token],
  moduleUnlocks: (token) => ["moduleUnlocks", token],
  modules: (token) => ["modules", token],
  pocFiles: (token, moduleId, topicId) => ["pocFiles", token, moduleId, topicId],
};
