export const expireAccessToken = () => {
  fetch("/api/dev/expireAccessToken", {
    method: "PUT"
  })
}

export const invalidateRefreshToken = () => {
  fetch("/api/dev/invalidateRefreshToken", {
    method: "PUT"
  })
}