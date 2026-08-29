import { useCallback, useEffect } from "react";
import { NotAuthorizedError, useAuth } from "../auth/AuthHooks";
import { notifications } from "@mantine/notifications";
import { XIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, type UseMutationOptions, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";


const useHandleFetchResponse = <T,>(): (res: Response) => Promise<T> => {
    const auth = useAuth()

    return useCallback((res: Response) => {
        if (res.status === 401) {
            auth.logout()
            throw new NotAuthorizedError()
        } else if (!res.ok) {
            throw new Error(`Request failed with status ${res.status}`)
        } else {
            return Promise.resolve(res.json() as T)
        }
    }, [auth])
}

const useHandleFetchError = (error: Error|null) => {
    useEffect(() => {
        //we can ignore NotAuthorizedError because we auto-logout on those errors
        if (!error || error instanceof NotAuthorizedError) {
            return
        }

        notifications.show({
            title: "Error",
            message: `${error.message}`,
            icon: <XIcon />,
            color: "red",
            autoClose: false,
            position: "top-center"
        })
    }, [error])
}

export const useAuthMutate = <TData,TVariables>(url: string, method: string, options?: UseMutationOptions<TData, Error, TVariables, unknown>, fetchParams?: RequestInit): UseMutationResult<TData, Error, TVariables> => {
    const handleFetchResponse = useHandleFetchResponse<TData>()
    const rv = useMutation<TData, Error, TVariables>({...options, mutationFn: (body?: TVariables) => {
        const headers: HeadersInit = {}

        const params: RequestInit = {
            ...fetchParams,
            headers: headers,
            method: method
        }

        if (body) {
            headers["Content-Type"] = "application/json"
            params.body = JSON.stringify(body)
        }
        
        return fetch(url, params).
            then(handleFetchResponse)        
    }})

    useHandleFetchError(rv.error)

    return rv
}

export const useAuthFetch = <T,>(url: string): UseQueryResult<T> => {
    const auth = useAuth()
    const handleFetchResponse = useHandleFetchResponse<T>()
    
    const rv = useQuery<T>({
        queryKey: ['authFetch', url],
        queryFn: () => fetch(url).then(handleFetchResponse),
        enabled: auth.isAuthenticated,
    });

    useHandleFetchError(rv.error)

    return rv
}