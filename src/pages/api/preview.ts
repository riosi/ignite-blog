import { Document } from '@prismicio/client/types/documents';
import { getPrismicClient } from '../../services/prismic'

import { NextApiRequest, NextApiResponse } from 'next'


function linkResolver(doc: Document): string {
  if (doc.type === 'posts') {
    return `/post/${doc.uid}`;
  }
  return '/';
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const { documentId, token } = req.query; 

    const redirectUrl = await getPrismicClient({ req: req})
    .getPreviewResolver(String(token), String(documentId))
    .resolve(linkResolver, '/');

    if (!redirectUrl) {
        return res.status(404).json({ message: 'Invalid token'});
    }

    res.setPreviewData({ ref: token });
    res.writeHead(302, { Location: `${redirectUrl}`});

    return res.end()
}