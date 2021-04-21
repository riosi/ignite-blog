import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useMemo } from 'react';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { getPrismicClient } from '../../services/prismic';
import { RichText } from 'prismic-dom';

import Header from '../../components/Header';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  pagination: {
    nextPage: {
      title: string;
      href: string;
    };
    prevPage: {
      title: string;
      href: string;
    };
  };
}

export default function Post({ post, pagination }: PostProps) {
  const router = useRouter();

  const readTime = useMemo(() => {
    const HUMAN_READ_WORDS_PER_MINUTE = 200;

    const words = post?.data?.content?.reduce((contentWords, content) => {
      contentWords.push(...content.heading.split(' '));

      const sanitizedContent = RichText.asText(content.body)
        .replace(/[^\w|\s]/g, '')
        .split(' ');

      contentWords.push(...sanitizedContent);

      return contentWords;
    }, []);

    return Math.ceil(words?.length / HUMAN_READ_WORDS_PER_MINUTE);
  }, [post]);

  return (
      <>
      <Head>
        <meta name="description" content={post?.data?.subtitle} />

        <title>{post?.data?.title ?? 'spacetraveling'}</title>
      </Head>

      <Header />

      <div className={styles.container}>
        <img
          src={post?.data?.banner.url ?? '/images/banner.png'}
          alt={post?.data?.author ?? 'Banner'}
        />

        <article className={commonStyles.container}>
          <header>
            <h1>
              {router.isFallback
                ? 'Carregando...'
                : post?.data?.title || 'Título'}
            </h1>
            <div className={commonStyles.postInfo}>
              <time>
                <FiCalendar />
                {post?.first_publication_date
                  ? format(
                      new Date(post?.first_publication_date),
                      'dd MMM yyy',
                      { locale: ptBR }
                    )
                  : 'Data de publicação'}
              </time>
              <span>
                <FiUser />
                {post?.data?.author ?? 'Autor'}
              </span>

              <span>
                <FiClock />
                {readTime ? `${readTime} min` : 'Tempo de leitura'}
              </span>
            </div>
          </header>

          <main>
            {post?.data?.content?.map(groupContent => (
              <div key={groupContent.heading}>
                <h2>{groupContent.heading}</h2>
                <div
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(groupContent.body),
                  }}
                />
              </div>
            ))}
          </main>

          <hr />

          {pagination && (
            <section className={styles.postPagination}>
              {pagination.prevPage && (
                <span>
                  {pagination.prevPage.title}
                  <Link href={pagination.prevPage.href}>
                    <a>Post Anterior</a>
                  </Link>
                </span>
              )}

              {pagination.nextPage && (
                <span className={styles.nextPage}>
                  {pagination.nextPage.title}
                  <Link href={pagination.nextPage.href}>
                    <a>Próximo post</a>
                  </Link>
                </span>
              )}
            </section>
          )}
        </article>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
  );

  const paths = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  return {
    fallback: true,
    paths,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  const { results: [prevPage] } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], 
  {
    after: response.id,
    orderings: '[document.first_publication_date desc]',
  });

  const { results: [nextPage] } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], 
  {
    after: response.id,
    orderings: '[document.first_publication_date]',
  });

  const pagination = {
    nextPage: nextPage
      ? {
          title: nextPage.data.title,
          href: `/post/${nextPage.uid}`,
        }
      : null,
    prevPage: prevPage
      ? {
          title: prevPage.data.title,
          href: `/post/${prevPage.uid}`,
        }
      : null,
  };

  return {
    props: {
      post,
      pagination: nextPage || prevPage ? pagination : null,
    },
  };
};
