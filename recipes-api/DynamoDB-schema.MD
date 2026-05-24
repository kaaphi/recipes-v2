# DynamoDB Schema Design

## DynamoDB Schema

- Partition Key
  - Partitioned by users
  - Value: `u#<id>`
- Sort Key Values:
  - Meta record
    - Contains all the details of the user
    - Value: `Meta`
  - Recipe record
    - Contains deeply nested data structure with all the attributes of the recipe
    - Values:
      - `r#<id>` for active recipies
      - `ar#<id>` for archived recipes
        - Since the sort key value cannot be changed, archiving a record means adding a new record and deleting the old record

## Current v1 State in Postgres

The Postgres Schema looks like this:
```sql
CREATE TABLE public.recipes (
	id uuid NOT NULL,
	userid int4 NULL,
	recipe jsonb NULL,
	createdtime timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedtime timestamp NULL,
	isarchived bool NOT NULL DEFAULT false,
	CONSTRAINT recipes_pkey PRIMARY KEY (id)
);
CREATE INDEX recipes_userid_id ON public.recipes USING btree (userid, id);
CREATE INDEX recipes_userid_isarchive ON public.recipes USING btree (userid, isarchived, id);

ALTER TABLE public.recipes ADD CONSTRAINT recipes_userid_fkey FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE;
```

Example JSON from existing Recipes:
```json
{
    "title": "Lasagna",
    "method": "1. Make meat sauce\r\n1. Heat oven to 400°F\r\n1. Cook noodles\r\n3. Wilt spinach and combine with ricotta and a bit of meat sauce\r\n2. Smear pan with butter or oil\r\n3. Put in a layer of noodles\r\n4. Over first three layers, spread ricotta, then meat sauce, then mozzarella, then parmesan; perhaps a bit of salt and pepper\r\n5. No ricotta on top layer\r\n6. Bake for 20-30 minutes, until bubbly\r\n7. Let rest for 5 minutes before serving\r\n",
    "sources": [],
    "ingredientLists": [
        {
            "ingredients": [
                {
                    "name": "Meat sauce"
                },
                {
                    "name": "Lasagna noodles"
                },
                {
                    "name": "Ricotta"
                },
                {
                    "name": "Mozzarella"
                },
                {
                    "name": "Parmesan"
                },
                {
                    "name": "Spinach"
                }
            ]
        },
        {
            "name": "Meat Sauce:",
            "ingredients": [
                {
                    "name": "Carrots"
                },
                {
                    "name": "Celery"
                },
                {
                    "name": "Snoino"
                },
                {
                    "name": "Garlic"
                },
                {
                    "name": "Tomatoes"
                },
                {
                    "name": "Meat (beef, pork, and/or lamb)"
                }
            ]
        }
    ]
}
```