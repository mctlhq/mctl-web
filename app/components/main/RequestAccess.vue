<script lang="ts" setup>
import GithubIcon from '@/assets/icons/github.svg';

const loginWithGithub = () => {
  console.log('Login with GitHub');
}
</script>

<template>
  <section id="request-access" class="request-access">
    <BaseContainer>
      <BaseCard class="request-access__card">
        <h2 class="request-access__title">
          Request access
        </h2>
        <p class="request-access__subtitle">
          Войдите через GitHub — мы создадим рабочее пространство для вашей команды.
        </p>
        <BaseButton
          variant="secondary"
          size="lg"
          @click="loginWithGithub"
        >
          <GithubIcon />
          <span>Войти через GitHub</span>
        </BaseButton>
        <p class="request-access__github-disclaimer">
          Requests read-only access: your username, avatar, and verified email.<br>
          No access to your code or repositories.
        </p>
        <form action="">
          <BaseFormField
            id="team"
            label="Название команды"
            placeholder="my-team"
            info="Строчные буквы через дефис — станет вашим namespace в кластере"
          />
          <BaseFormField
            id="description"
            label="Что планируете запускать"
          >
            <BaseTextarea
              id="description"
              placeholder="Расскажите о проекте - что хотите развернуть"
            />
          </BaseFormField>
          <BaseButton
            size="lg"
            block
            class="request-access__cta"
          >
            Отправить заявку
          </BaseButton>
        </form>
      </BaseCard>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.request-access {
  padding: 60px 0;
  background-color: var(--color-bg-secondary);
  text-align: center;

  &__card {
    width: 600px;
    margin: 32px auto 0;
  }

  &__subtitle {
    margin-bottom: 20px;
  }

  &__github-disclaimer {
    margin: 10px 0 20px;

    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-muted);
  }

  &__cta {
    margin-top: 20px;
  }
}
</style>
