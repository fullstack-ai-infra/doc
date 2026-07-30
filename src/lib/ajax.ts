interface IOption {
  url: string
  method: string
  headers?: { [key: string]: string }
  body?: any
}

export interface IAjaxRes {
  errno: number
  msg?: string
  data?: any
}

async function ajax(opt: IOption): Promise<IAjaxRes> {
  const { url, method, headers = {}, body } = opt
  try {
    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const resData = await res.json()
    return resData
  } catch (ex: any) {
    throw new Error('ajax error ', ex.message)
  }
}

export async function get(url: string) {
  return await ajax({ url, method: 'GET' })
}

export async function post(url: string, data: any) {
  return await ajax({ url, method: 'POST', body: data })
}

export async function patch(url: string, data: any) {
  return await ajax({ url, method: 'PATCH', body: data })
}

export async function del(url: string, data: any) {
  return await ajax({ url, method: 'DELETE', body: data })
}
