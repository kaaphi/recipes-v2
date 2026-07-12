import { notifications } from "@mantine/notifications"
import { XIcon } from "@phosphor-icons/react"
import { useEffect } from "react"
import { headerHeight } from "./App";



export const scrollToElement = (elementId: string) => {
  const element = document.getElementById(elementId)
  const elementRect = element!.getBoundingClientRect();
  const absoluteElementTop = elementRect.top + window.scrollY;
  window.scrollTo({
    top: absoluteElementTop - headerHeight,
    behavior: 'instant'
  });
};

export const useHandleError = (error: Error | null, message?: string, title?: string) => {
  useEffect(() => {
    if (!error) {
      return
    }

    notifications.show({
      title: title ? title : "Error",
      message: message ? message : `${error}`,
      icon: <XIcon />,
      color: "red",
      autoClose: false,
      position: "top-center"
    })
  }, [error, message, title])
}